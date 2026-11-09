import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { initializeNextApp } from '../templates/initializers/next.mjs';
import { targetFiles } from '../templates/files.mjs';

for (const [text, config, content] of [
  [false, false, false],
  [false, false, true],
  [true, false, false],
  [true, false, true],
  [false, true, false],
  [false, true, true],
  [true, true, false],
  [true, true, true],
]) {
  test(`Next initialization respects prepared capabilities: text=${text}, config=${config}, content=${content}`, (context) => {
    const root = mkdtempSync(path.join(tmpdir(), 'next-initializer-'));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    const target = path.join(root, 'apps/renamed');
    mkdirSync(target, { recursive: true });
    for (const name of ['tsconfig.json', 'tsconfig.e2e.json'])
      writeFileSync(path.join(target, name), '{}');
    writeFileSync(
      path.join(target, 'package.json'),
      JSON.stringify({
        workspaceTextResources: text,
        workspaceAppConfig: config,
        workspaceContentResources: content,
        scripts: { dev: 'next dev' },
      })
    );
    initializeNextApp({
      appId: 'renamed',
      config: { app: { devPort: 3000, testPort: 3100 } },
      files: targetFiles(target, root),
    });
    const manifest = JSON.parse(readFileSync(path.join(target, 'package.json'), 'utf8'));
    assert.equal(manifest.scripts.dev, 'next dev');
    for (const [kind, enabled] of [
      ['text', text],
      ['config', config],
      ['content', content],
      ['app', text || config || content],
    ])
      for (const operation of ['prepare', 'check']) {
        const command = manifest.scripts[`${kind}:${operation}`];
        if (!enabled) assert.equal(command, undefined);
        else
          assert.equal(
            command,
            `node ../../scripts/prepare-app.mjs --kind ${kind} --app renamed${operation === 'check' ? ' --check' : ''}`
          );
      }
    assert.equal(
      JSON.parse(readFileSync(path.join(target, 'tsconfig.json'), 'utf8')).extends,
      '../../tsconfig.react.json'
    );
    assert.match(readFileSync(path.join(target, 'playwright.config.ts'), 'utf8'), /'renamed'/);
  });
}

test('namespace Text preparation keeps the readiness guard and remaps app commands', (context) => {
  const root = mkdtempSync(path.join(tmpdir(), 'next-resources-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const target = path.join(root, 'apps/renamed');
  mkdirSync(target, { recursive: true });
  for (const name of ['tsconfig.json', 'tsconfig.e2e.json'])
    writeFileSync(path.join(target, name), '{}');
  writeFileSync(
    path.join(target, 'package.json'),
    JSON.stringify({ workspaceTextResources: true, scripts: { dev: 'pnpm app:check && next dev' } })
  );
  initializeNextApp({
    appId: 'renamed',
    config: { app: { devPort: 3000, testPort: 3100 } },
    files: targetFiles(target, root),
  });
  const manifest = JSON.parse(readFileSync(path.join(target, 'package.json'), 'utf8'));
  assert.equal(manifest.scripts.dev, 'pnpm app:check && next dev');
  assert.match(manifest.scripts['text:prepare'], /--kind text --app renamed$/);
  assert.match(manifest.scripts['app:check'], /--kind app --app renamed --check$/);
  assert.equal(manifest.scripts['config:prepare'], undefined);
});
