import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preparationOptions } from '../lib/preparation-options.mjs';
test('copy commands reject ambiguous sources and app selection', () => {
  assert.equal(preparationOptions(['--app', 'web', '--source', 'custom']).source, 'custom');
  assert.equal(preparationOptions(['--all', '--check']).check, true);
  for (const args of [
    ['--source'],
    ['--app', 'web', '--all'],
    ['--check', '--check'],
    ['--app', '../web'],
  ])
    assert.throws(() => preparationOptions(args));
});

test('source preparation accepts independent optional overrides without positional or ambiguous targets', () => {
  assert.equal(preparationOptions(['--source', 'auto']).source, 'auto');
  assert.equal(preparationOptions(['--include-templates']).includeTemplates, true);
  for (const args of [
    ['website'],
    ['--app', 'a', '--all'],
    ['--app', 'a', '--include-templates'],
    ['--kind', 'other'],
    ['--source', '--all'],
  ])
    assert.throws(() => preparationOptions(args));
});
