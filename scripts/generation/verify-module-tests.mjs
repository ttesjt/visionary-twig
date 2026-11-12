import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pnpmCommand } from '../lib/processes.mjs';
import { readJson, writeJson } from '../templates/files.mjs';

const tests = {
  'module-format.test.mts': [
    "import { expect, it } from 'vitest';",
    '',
    "it('runs the .mts test', () => expect(import.meta.url).toContain('.mts'));",
  ],
  'module-format.spec.cts': ["it('runs the .cts test', () => expect(1 + 1).toBe(2));"],
};

export function addModuleTestFixtures(directory) {
  const configPath = path.join(directory, 'tsconfig.json');
  const config = readJson(configPath);
  // The CommonJS-format test uses Vitest globals to stay valid under NodeNext.
  writeJson(configPath, { ...config, compilerOptions: { types: ['node', 'vitest/globals'] } });
  writeFileSync(
    path.join(directory, 'vitest.config.ts'),
    [
      "import { defineConfig, mergeConfig } from 'vitest/config';",
      "import base from '../../vitest.config.base.js';",
      'export default mergeConfig(base, defineConfig({ test: { globals: true } }));',
      '',
    ].join('\n')
  );
  for (const [file, lines] of Object.entries(tests))
    writeFileSync(path.join(directory, 'src', file), lines.join('\n') + '\n');
}

export async function verifyModuleTests(project, directory, packageName, scratch, run) {
  const report = path.join(scratch, 'vitest-module-tests.json');
  await run(project, ['--filter', packageName, 'test', '--reporter=json', '--outputFile', report]);
  const { testResults } = readJson(report);
  const buildFiles = readdirSync(path.join(directory, 'dist'), { recursive: true });
  assert.ok(!buildFiles.some((file) => /\.(?:test|spec)\./u.test(file)));
  for (const file of Object.keys(tests)) {
    const result = testResults.find(({ name }) => path.basename(name) === file);
    assert.equal(result?.status, 'passed', file + ' must run in Vitest');
    assert.ok(result.assertionResults.some(({ status }) => status === 'passed'));
    const [command, args] = pnpmCommand(['exec', 'eslint', '--print-config', 'src/' + file]);
    const config = JSON.parse(execFileSync(command, args, { cwd: directory, encoding: 'utf8' }));
    assert.equal(config.rules['@typescript-eslint/no-explicit-any'][0], 2);
  }
}
