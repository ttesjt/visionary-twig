import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { existsSync } from 'node:fs';
const root = path.resolve(import.meta.dirname, '../..');
const help = (file, args = []) => {
  const result = spawnSync(process.execPath, ['scripts/' + file, ...args, '--help'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};
test('single-host help never promises unsupported batch selectors', () => {
  for (const [file, args] of [
    ['dev.mjs', []],
    ['run-app.mjs', ['start']],
  ]) {
    const text = help(file, args);
    assert.match(text, /--app/);
    assert.doesNotMatch(text, /--all|--include-templates/);
  }
  assert.match(help('run-app.mjs', ['build']), /--include-templates/);
});
test(
  'preparation and read-only checks describe distinct side effects and their real entry names',
  { skip: !existsSync(path.join(root, 'scripts/prepare-app.mjs')) },
  () => {
    assert.match(help('prepare-app.mjs', ['--kind', 'text']), /pnpm text:prepare/);
    const checked = help('prepare-app.mjs', ['--kind', 'config', '--check']);
    assert.match(checked, /pnpm config:check/);
    assert.match(checked, /without installation, builds or writes/);
    assert.doesNotMatch(checked, /writes only/);
    assert.match(help('bootstrap.mjs'), /--offline/);
  }
);

test('workspace task help explains aggregate reuse and side effects', () => {
  const aggregate = help('run-workspace.mjs', ['validate']);
  assert.match(aggregate, /builds libraries once/);
  assert.match(aggregate, /No installation, preparation, browser tests or cloud data operations/);
  assert.match(help('run-workspace.mjs', ['lint']), /--fix edits source files/);
  assert.match(help('run-workspace.mjs', ['test']), /--watch/);
});
