import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { stringify, parse } from 'yaml';
import { seedLockfile } from '../templates/lockfile.mjs';
import { pnpmCommand } from '../lib/processes.mjs';

test('renamed root workspace dependencies support the first frozen install in CI', (context) => {
  const root = mkdtempSync(path.join(tmpdir(), 'template-lock-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'source'),
    destination = path.join(root, 'generated');
  const directory = 'packages/shared/text-catalog';
  mkdirSync(source);
  mkdirSync(path.join(destination, directory), { recursive: true });
  writeFileSync(
    path.join(source, 'pnpm-lock.yaml'),
    stringify({
      lockfileVersion: '9.0',
      settings: { autoInstallPeers: true, excludeLinksFromLockfile: false },
      catalogs: { default: { 'unused-sdk': { specifier: '1.0.0', version: '1.0.0' } } },
      importers: {
        '.': {
          devDependencies: {
            '@source/text-catalog': { specifier: 'workspace:*', version: 'link:' + directory },
            '@source/unused': { specifier: 'workspace:*', version: 'link:unused' },
          },
        },
        [directory]: {},
      },
    })
  );
  writeFileSync(
    path.join(destination, 'package.json'),
    JSON.stringify({
      name: '@example/workspace',
      private: true,
      devDependencies: { '@example/text-catalog': 'workspace:*' },
    })
  );
  writeFileSync(
    path.join(destination, directory, 'package.json'),
    JSON.stringify({ name: '@example/text-catalog', version: '0.1.0', private: true })
  );
  writeFileSync(
    path.join(destination, 'pnpm-workspace.yaml'),
    stringify({ packages: ['packages/shared/*'] })
  );
  seedLockfile(source, destination, {
    packages: [{ manifest: { name: '@source/text-catalog' }, destination: directory }],
    templates: [],
    mapping: {
      packages: { '@source/text-catalog': '@example/text-catalog' },
      directories: { [directory]: directory },
    },
  });
  const filename = path.join(destination, 'pnpm-lock.yaml');
  const before = readFileSync(filename, 'utf8');
  assert.equal(parse(before).catalogs, undefined, 'Removed catalogs must not survive generation.');
  assert.deepEqual(parse(before).importers['.'].devDependencies, {
    '@example/text-catalog': { specifier: 'workspace:*', version: 'link:' + directory },
  });
  // No --no-frozen-lockfile: CI's default must work before any reconciliation.
  const [bin, args] = pnpmCommand(['install', '--offline', '--ignore-scripts']);
  execFileSync(bin, args, { cwd: destination, env: { ...process.env, CI: 'true' }, stdio: 'pipe' });
  assert.equal(readFileSync(filename, 'utf8'), before);
});
