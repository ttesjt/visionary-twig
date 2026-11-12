import { readFileSync } from 'node:fs';
import path from 'node:path';
import { appFilter } from '../../tooling/workspace-apps.ts';
import { selectTargets } from './targets.mjs';
import { packageTaskSteps, runTaskSteps } from './package-tasks.mjs';
import { PACKAGE_GROUPS as groups } from './packages.mjs';

const excludes = ['apps/**', 'packages/**', 'test/e2e/**', 'playwright.config.ts'];

export function workspaceTaskSteps(root, action, options = {}) {
  const policy = { groups, excludes };
  if (action === 'validate') {
    const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    const apps = selectTargets(root, { all: true, includeTemplates: true });
    policy.beforeChecks = manifest.scripts?.['app:check']
      ? [['app:check', '--all', '--include-templates']]
      : [];
    policy.afterTests = apps.map((app) => ['--filter', appFilter(root, app), 'build']);
  }
  return packageTaskSteps(root, action === 'build:packages' ? 'build' : action, options, policy);
}

export async function runWorkspaceTask(root, action, options = {}) {
  return runTaskSteps(root, workspaceTaskSteps(root, action, options));
}
