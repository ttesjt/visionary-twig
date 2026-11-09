import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { discoverApps } from '../../tooling/workspace-apps.ts';
import { readWorkspaceRecord } from './record.mjs';
import { git } from './git.mjs';
import { checkDeliveredDocumentation } from '../templates/documentation.mjs';

/** Source-only acceptance of the actual public CLI artifact, including each task's Git boundary. */
export function verifyGeneratedWorkspace(root, applications) {
  const read = (file) => readFileSync(path.join(root, file), 'utf8');
  const manifest = JSON.parse(read('package.json'));
  const record = readWorkspaceRecord(root);
  assert.deepEqual(
    discoverApps(root)
      .map((app) => app.id)
      .sort(),
    applications.map(([id]) => id).sort()
  );
  assert.equal(manifest.workspaceDefaultApp, applications[0]?.[0]);
  assert.equal(git(root, ['rev-list', '--count', 'HEAD']).trim(), String(applications.length + 1));
  assert.equal(git(root, ['remote']), '');
  assert.equal(git(root, ['status', '--porcelain=v1']), '');
  const commits = git(root, ['rev-list', '--reverse', 'HEAD']).trim().split('\n');
  assert.equal(
    git(root, ['show', '-s', '--format=%s', commits[0]]).trim(),
    'chore(workspace): initialize frontend monorepo'
  );
  for (const [index, [id, template]] of applications.entries()) {
    const commit = commits[index + 1];
    assert.equal(
      git(root, ['show', '-s', '--format=%s', commit]).trim(),
      'feat(' + id + '): initialize from ' + template
    );
    const files = git(root, ['diff-tree', '--no-commit-id', '--name-only', '-r', commit])
      .trim()
      .split('\n');
    assert.ok(
      files.every(
        (file) =>
          file.startsWith('apps/' + id + '/') ||
          file.startsWith('packages/site/') ||
          file.startsWith('packages/adapters/') ||
          file.startsWith('packages/shared/') ||
          [
            'package.json',
            'pnpm-workspace.yaml',
            'pnpm-lock.yaml',
            '.workspace-template.json',
          ].includes(file)
      )
    );
    assert.equal(JSON.parse(read('apps/' + id + '/package.json')).name, record.scope + '/' + id);
  }
  for (const absent of [
    'packages/templates',
    'scaffolds',
    'scripts/templates',
    'scripts/generation',
    'scripts/clone-template.mjs',
    'docs/template-repository',
  ])
    assert.equal(existsSync(path.join(root, absent)), false, absent);
  assert.deepEqual(parse(read('pnpm-workspace.yaml')).packages, [
    'apps/*',
    'packages/shared/*',
    'packages/site/*',
    'packages/adapters/*',
  ]);
  assert.doesNotMatch(read('pnpm-lock.yaml'), /wrangler@|@cloudflare\//);
  assert.doesNotMatch(read('.npmrc'), /NODE_AUTH_TOKEN|npm.pkg.github.com/);
  assert.equal(read('README.md'), git(root, ['show', commits[0] + ':README.md']));
  checkDeliveredDocumentation(root);
}
