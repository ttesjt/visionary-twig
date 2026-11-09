import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { appConfigDefinition } from '@frontend/app-config/node';
import { textResourcesDefinition } from '@frontend/text-catalog/resource/node';
import { commitPrepared, resolvePrepared } from '@frontend/prepared-data/node';

const sourceRoot = path.resolve(import.meta.dirname, '../..');
const CONCURRENT_PREPARATION_TIMEOUT_MS = 30_000;

test(
  'concurrent text/config commands cannot publish a combination validated against an old counterpart',
  { timeout: CONCURRENT_PREPARATION_TIMEOUT_MS },
  async (context) => {
    mkdirSync(path.join(sourceRoot, 'test-results'), { recursive: true });
    const root = mkdtempSync(path.join(sourceRoot, 'test-results/preparation-concurrency-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    symlinkSync(path.join(sourceRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
    const write = (relative, value) => {
      const filename = path.join(root, relative);
      mkdirSync(path.dirname(filename), { recursive: true });
      writeFileSync(filename, typeof value === 'string' ? value : JSON.stringify(value));
    };
    for (const file of [
      'scripts/prepare-app.mjs',
      'scripts/lib/preparation-options.mjs',
      'tooling/workspace-apps.ts',
      'scripts/workspace/options.mjs',
      'scripts/workspace/targets.mjs',
      'scripts/workspace/packages.mjs',
      'scripts/lib/workspace-layers.mjs',
      'scripts/workspace/inputs.mjs',
      'scripts/workspace/help.mjs',
    ]) {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      cpSync(path.join(sourceRoot, file), path.join(root, file));
    }
    // Build orchestration is irrelevant here; both subprocesses use the real CLI, definitions and storage engine.
    write(
      'scripts/lib/processes.mjs',
      'export const pnpmCommand = (args) => args; export const runProcesses = async () => 0;'
    );
    write('package.json', { type: 'module' });
    write('apps/sample/package.json', {
      type: 'module',
      workspaceKind: 'next-app',
      workspaceApp: {
        devPort: 3000,
        testPort: 3100,
        hostname: '127.0.0.1',
        testConfig: 'playwright.config.ts',
      },
    });
    write('apps/sample/playwright.config.ts', 'export default {};');
    write(
      'apps/sample/text-resources.config.ts',
      "export default {version:1,contentVersion:'v1',locales:['en'],namespaces:['main']};"
    );
    write(
      'apps/sample/config.config.ts',
      "import { z } from 'zod'; export default {version:1,schema:z.strictObject({showIntroduction:z.boolean()})};"
    );
    write(
      'apps/sample/app-inputs.config.ts',
      `export default { async validate(text, config) {
    if (config.showIntroduction && text.locales.en.main.introduction.length < 10) throw new Error('Introduction must have at least 10 characters when enabled.');
    process.send?.('validated');
    await new Promise(resolve => process.once('message', resolve));
  }};`
    );
    write('apps/sample/content/default/text/en/main.json', {
      introduction: 'Original introduction',
    });
    write('apps/sample/config/default/app.json', { showIntroduction: false });
    write('apps/sample/.local/content/text/en/main.json', { introduction: 'Short' });
    write('apps/sample/.local/config/app.json', { showIntroduction: true });
    const app = path.join(root, 'apps/sample');
    const load = async (file) => (await import(pathToFileURL(path.join(app, file)).href)).default;
    const definitions = [
      textResourcesDefinition(await load('text-resources.config.ts')),
      appConfigDefinition(await load('config.config.ts')),
    ];
    await commitPrepared(
      app,
      await Promise.all(
        definitions.map((definition) => resolvePrepared(app, definition, 'default'))
      )
    );
    function start(kind) {
      const child = fork(
        path.join(root, 'scripts/prepare-app.mjs'),
        ['--app', 'sample', '--kind', kind, '--source', 'custom'],
        { cwd: root, execArgv: [], stdio: ['ignore', 'ignore', 'pipe', 'ipc'] }
      );
      let errors = '';
      child.stderr.on('data', (chunk) => {
        errors += chunk;
      });
      const ready = once(child, 'message', {
        signal: globalThis.AbortSignal.timeout(CONCURRENT_PREPARATION_TIMEOUT_MS),
      });
      const closed = once(child, 'close');
      context.after(async () => {
        if (child.exitCode === null) child.kill();
        await closed;
      });
      return { child, ready, closed, errors: () => errors };
    }
    const text = start('text');
    const config = start('config');
    await Promise.all([text.ready, config.ready]);
    // Both combinations have passed validation against the same old generation.
    text.child.send('commit');
    assert.equal((await text.closed)[0], 0, text.errors());
    config.child.send('commit');
    assert.equal((await config.closed)[0], 1);
    assert.match(config.errors(), /changed during validation/);
    const dictionary = JSON.parse(
      readFileSync(path.join(app, '.generated/text/en/main.json'), 'utf8')
    );
    const configuration = JSON.parse(
      readFileSync(path.join(app, '.generated/config/app.json'), 'utf8')
    );
    assert.equal(dictionary.introduction, 'Short');
    assert.equal(configuration.showIntroduction, false);
    assert.equal(existsSync(path.join(app, '.generated/prepare.lock')), false);
    assert.deepEqual(JSON.parse(readFileSync(path.join(app, '.local/config/app.json'), 'utf8')), {
      showIntroduction: true,
    });
  }
);
