import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  chmodSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { cloneRepository } from '../generation/create.mjs';
import { appendTemplate } from '../generation/append.mjs';
import { generationOptions } from '../generation/options.mjs';
import { git } from '../generation/git.mjs';
import { readTemplateCatalog } from '../templates/catalog.mjs';
import { validateTemplateSetup } from '../templates/setup.mjs';
import { setupTemplate } from '../generation/setup.mjs';

const source = path.resolve(import.meta.dirname, '../..');
const root = mkdtempSync(path.join(tmpdir(), 'generation-setup-'));
const base = path.join(root, 'base');
const noCommands = async () => {};
let config;
before(async () => {
  await cloneRepository(source, base, { bare: true }, { run: noCommands });
  const entry = (await readTemplateCatalog(source)).find((entry) => entry.id === 'plain-next');
  config = entry.config;
  config.setup = {
    command: ['data:setup'],
    outputs: ['.local/store'],
    demo: { command: ['data:setup', '--with-demo'], files: { 'demo.txt': 'template/README.md' } },
  };
});
after(() => {
  delete config.setup;
  rmSync(root, { recursive: true, force: true });
});
function target() {
  const folder = path.join(root, 'case-' + Math.random().toString(36).slice(2));
  git(base, ['clone', '--quiet', '--no-local', '--', base, folder]);
  return folder;
}

test('setup flags are explicit, mutually exclusive and unavailable for bare or Node clones', () => {
  for (const kind of ['repository', 'template']) {
    const args =
      kind === 'repository' ? ['--output', '/tmp/app'] : ['--target', '/tmp/app', '--name', 'web'];
    assert.equal(generationOptions([...args, '--setup'], kind).setup, 'empty');
    assert.equal(generationOptions([...args, '--setup-with-demo'], kind).setup, 'demo');
    assert.throws(
      () => generationOptions([...args, '--setup', '--setup-with-demo'], kind),
      /exclusive/
    );
  }
  for (const extra of [['--bare'], ['--preset', 'node']])
    assert.throws(
      () => generationOptions(['--output', '/tmp/app', ...extra, '--setup'], 'repository'),
      /cannot be combined/
    );
});

for (const mode of [undefined, 'empty', 'demo']) {
  test('publishes portable demo inputs and initializes the final target for ' + mode, async () => {
    const folder = target();
    const commands = [];
    await appendTemplate(
      source,
      folder,
      { appName: 'reader', setup: mode },
      {
        run: async (cwd, args) => {
          commands.push({ cwd, args });
          if (args[0] !== '--dir') return;
          const output = path.join(cwd, args[1], '.local/store/data.json');
          mkdirSync(path.dirname(output), { recursive: true });
          writeFileSync(output, JSON.stringify({ demo: args.includes('--with-demo') }));
        },
      }
    );
    assert.equal(existsSync(path.join(folder, 'apps/reader/template')), false);
    assert.equal(existsSync(path.join(folder, 'apps/reader/demo.txt')), mode === 'demo');
    const output = path.join(folder, 'apps/reader/.local/store/data.json');
    assert.equal(existsSync(output), mode !== undefined);
    if (mode) {
      assert.deepEqual(JSON.parse(readFileSync(output)), { demo: mode === 'demo' });
      assert.equal(commands.filter(({ args }) => args[0] === '--dir').length, 2);
      const bootstrap = commands.findIndex(
        ({ cwd, args }) => cwd === folder && args[0] === 'bootstrap'
      );
      assert.ok(
        commands.findIndex(({ cwd, args }) => cwd === folder && args[0] === '--dir') > bootstrap
      );
    }
    assert.equal(git(folder, ['status', '--porcelain']), '');
    assert.equal(git(folder, ['rev-list', '--count', 'HEAD']).trim(), '2');
  });
}

for (const failure of ['setup', 'empty setup', 'commit']) {
  test('rolls back only owned local outputs after ' + failure + ' failure', async () => {
    const folder = target();
    const before = git(folder, ['rev-parse', 'HEAD']);
    let hook;
    mkdirSync(path.join(folder, '.local'), { recursive: true });
    writeFileSync(path.join(folder, '.local/user.txt'), 'keep');
    if (failure === 'commit') {
      hook = git(folder, [
        'rev-parse',
        '--path-format=absolute',
        '--git-path',
        'hooks/pre-commit',
      ]).trim();
      writeFileSync(hook, '#!/bin/sh\nexit 1\n');
      chmodSync(hook, 0o755);
    }
    await assert.rejects(
      appendTemplate(
        source,
        folder,
        { appName: 'reader', setup: 'demo' },
        {
          run: async (cwd, args) => {
            if (args[0] !== '--dir') return;
            const output = path.join(cwd, args[1], '.local/store/data.json');
            mkdirSync(path.join(path.dirname(output), 'media/empty'), { recursive: true });
            if (failure !== 'empty setup') writeFileSync(output, 'partial data');
            if (cwd === folder && failure !== 'commit') throw new Error('setup interrupted');
          },
        }
      )
    );
    assert.equal(existsSync(path.join(folder, 'apps/reader/.local/store/data.json')), false);
    assert.equal(git(folder, ['rev-parse', 'HEAD']), before);
    assert.equal(git(folder, ['status', '--porcelain']), '');
    assert.equal(readFileSync(path.join(folder, '.local/user.txt'), 'utf8'), 'keep');
    assert.equal(existsSync(path.join(folder, 'apps/reader')), false);
    if (hook) rmSync(hook);
    await appendTemplate(
      source,
      folder,
      { appName: 'reader', setup: 'empty' },
      { run: noCommands }
    );
    assert.equal(existsSync(path.join(folder, 'apps/reader/package.json')), true);
    assert.equal(git(folder, ['status', '--porcelain']), '');
  });
}

test('setup rollback preserves existing directories and later user files', async () => {
  for (const concurrent of [false, true]) {
    const folder = target();
    const local = path.join(folder, 'apps/reader/.local');
    mkdirSync(local, { recursive: true });
    const rollback = await setupTemplate(
      folder,
      { destination: 'apps/reader', setup: { command: ['data:setup'], outputs: ['.local/store'] } },
      {},
      async () => {
        mkdirSync(path.join(local, 'store/media'), { recursive: true });
        writeFileSync(path.join(local, 'store/database.sqlite'), 'database');
      }
    );
    const userFile = path.join(local, 'store/media/user.txt');
    if (concurrent) writeFileSync(userFile, 'keep');
    rollback();
    assert.equal(existsSync(local), true);
    assert.equal(existsSync(path.join(local, 'store/database.sqlite')), false);
    assert.equal(existsSync(path.join(local, 'store')), concurrent);
    if (concurrent) assert.equal(readFileSync(userFile, 'utf8'), 'keep');
  }
});

test('rejects unsupported setup before creating a repository', async () => {
  const folder = path.join(root, 'unsupported');
  await assert.rejects(
    cloneRepository(source, folder, { template: 'studio', setup: 'empty' }, { run: noCommands }),
    /does not support/
  );
  assert.equal(existsSync(folder), false);
});

test('setup declarations reject escaping outputs and missing or nonportable demo inputs', () => {
  const valid = { command: ['data:setup'], outputs: ['.local/data'] };
  for (const setup of [
    { ...valid, outputs: ['.local/../../outside'] },
    { ...valid, outputs: ['public/media'] },
    { ...valid, outputs: ['.local/data', '.local/data/sub'] },
    { ...valid, demo: { command: ['data:setup'], files: { '../escape': 'template/README.md' } } },
    {
      ...valid,
      demo: { command: ['data:setup'], files: { '.local/demo.json': 'template/README.md' } },
    },
    {
      ...valid,
      demo: { command: ['data:setup'], files: { 'demo.json': 'template/missing.json' } },
    },
  ])
    assert.throws(() =>
      validateTemplateSetup(path.join(source, 'packages/templates/plain-next'), setup)
    );
});
