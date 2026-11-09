import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

// The copied module has no node_modules ancestor providing a preparation engine.
test('inputless hosts do not import preparation dependencies or create generated inputs', async (context) => {
  const root = mkdtempSync(path.join(tmpdir(), 'inputless-host-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, 'apps/plain');
  mkdirSync(directory, { recursive: true });
  const module = path.join(root, 'scripts/workspace/inputs.mjs');
  mkdirSync(path.dirname(module), { recursive: true });
  mkdirSync(path.join(root, 'tooling'));
  cpSync(
    path.resolve(import.meta.dirname, '../../tooling/workspace-apps.ts'),
    path.join(root, 'tooling/workspace-apps.ts')
  );
  cpSync(path.resolve(import.meta.dirname, '../workspace/inputs.mjs'), module);
  const { prepareInputs } = await import(pathToFileURL(module).href);
  await prepareInputs([{ id: 'plain', directory }]);
  await prepareInputs([]);
  assert.equal(existsSync(path.join(directory, '.generated')), false);
});

test('declared namespace preparation cannot silently become inputless when its configuration is missing', async (context) => {
  const root = mkdtempSync(path.join(tmpdir(), 'missing-preparation-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, 'apps/plain');
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({ workspaceContentResources: true })
  );
  const { prepareInputs } = await import('../workspace/inputs.mjs');
  await assert.rejects(prepareInputs([{ id: 'plain', directory }]), /missing declared preparation/);
});
