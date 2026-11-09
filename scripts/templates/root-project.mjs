import { usesPreparedInputs } from '../../tooling/workspace-apps.ts';
import { readAdapterProviderPackages, isProviderPackage } from '../lib/workspace-layers.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { readJson, writeJson } from './files.mjs';

const REMOVED_SCRIPTS = new Set(['template:clone', 'test:templates']);
export function mergeRequirements(target, contribution = {}) {
  for (const group of ['scripts', 'devDependencies', 'catalog']) {
    for (const [key, value] of Object.entries(contribution[group] ?? {})) {
      if (typeof value !== 'string' || !value) throw new Error('Invalid root contribution: ' + key);
      if (target[group][key] !== undefined && target[group][key] !== value)
        throw new Error('Conflicting root contribution: ' + key);
      target[group][key] = value;
    }
  }
}
export function writeRootProject(source, destination, plan, contributions) {
  const manifest = readJson(path.join(source, 'package.json'));
  manifest.name = plan.name;
  manifest.description = 'Reusable frontend workspace';
  manifest.scripts = Object.fromEntries(
    Object.entries(manifest.scripts).filter(([key]) => !REMOVED_SCRIPTS.has(key))
  );
  const workspace = parse(readFileSync(path.join(source, 'pnpm-workspace.yaml'), 'utf8'));
  const providerPackages = readAdapterProviderPackages(source);
  for (const name of Object.keys(workspace.catalog))
    if (isProviderPackage(name, providerPackages)) delete workspace.catalog[name];
  delete manifest.devDependencies.yaml;
  manifest.devDependencies = Object.fromEntries(
    Object.entries(manifest.devDependencies).filter(
      ([name, value]) =>
        !value.startsWith('workspace:') || Object.hasOwn(plan.mapping.packages, name)
    )
  );

  const requirements = {
    scripts: manifest.scripts,
    devDependencies: manifest.devDependencies,
    catalog: { ...workspace.catalog },
  };
  for (const contribution of contributions) mergeRequirements(requirements, contribution);
  for (const name of Object.keys(requirements.devDependencies))
    if (isProviderPackage(name, providerPackages))
      throw new Error('Template root contributions cannot include provider SDKs: ' + name);
  const apps = plan.templates.filter((entry) => entry.type === 'app');
  const hasPreparedInputs = apps.some((entry) => usesPreparedInputs(entry.manifest));
  const primary = apps.find((entry) => entry.config.primary) ?? apps[0];
  if (primary) {
    manifest.scripts.dev = 'node scripts/dev.mjs';
    manifest.scripts.start = 'node scripts/run-app.mjs start';
    manifest.scripts['test:e2e'] = 'node scripts/test-e2e.mjs';
    manifest.workspaceDefaultApp = primary.appId;
  } else
    for (const key of ['dev', 'start', 'test:e2e', 'test:e2e:theme-policy'])
      delete manifest.scripts[key];
  if (!hasPreparedInputs) {
    for (const key of ['text', 'config', 'content', 'app'].flatMap((kind) => [
      kind + ':prepare',
      kind + ':check',
    ]))
      delete manifest.scripts[key];
    for (const dependency of [
      '@frontend/text-catalog',
      '@frontend/app-config',
      '@frontend/prepared-data',
    ])
      delete manifest.devDependencies[dependency];
  }
  writeJson(path.join(destination, 'package.json'), manifest);
  writeFileSync(
    path.join(destination, 'pnpm-workspace.yaml'),
    stringify({
      ...workspace,
      packages: ['apps/*', 'packages/shared/*'],
      catalog: requirements.catalog,
    })
  );
  const commands = apps.map((entry) => '- `pnpm dev --app ' + entry.appId + '`').join('\n');
  writeFileSync(
    path.join(destination, 'README.md'),
    '# ' +
      plan.name +
      '\n\nGenerated frontend workspace. Install with pnpm install; then run ' +
      (hasPreparedInputs ? 'pnpm bootstrap; then ' : '') +
      'pnpm validate.\n\n' +
      commands +
      '\n\nLibraries emit dist before hosts consume them. Root development runners build and watch dependencies. See docs/development.md for port fallback; explicit ports, tests and production are strict.\nApps own content, framework integration, style selection and persistence. Shared packages use neutral data. Read docs/code-standards.md for portable TS/frontend standards, docs/monorepo-standards.md for package collaboration and pnpm integration, and docs/repository-conventions.md for repository choices and enforcement.\n'
  );
  writeFileSync(
    path.join(destination, 'AGENTS.md'),
    '# Workspace rules\n\nUse the pinned Node/pnpm versions and one root lockfile. Root owns tooling; apps own hosts and content; packages/shared owns reusable capabilities.\nCSS belongs in styles workspaces. Use semantic classes and variants, no inline component styles.\nRead docs/code-standards.md for portable TS/frontend requirements, including recursive scopes, public APIs and actionable error diagnostics. Read docs/monorepo-standards.md for dependency ownership, public package APIs, build lifecycles and pnpm integration. Read docs/repository-conventions.md for selected workspace protocols, workspaceFeatures/workspaceEntrypoints declarations and actual check coverage. Apply review rules beyond automated coverage; do not refactor solely for size thresholds. References is never a clone dependency.\nRun pnpm validate and relevant browser checks. Build library dist before consumers.\n'
  );
  mkdirSync(path.join(destination, 'docs'), { recursive: true });
  writeFileSync(
    path.join(destination, 'docs/architecture.md'),
    '# Architecture\n\nRoot owns pinned tooling and runners. apps owns deployable hosts. packages/shared owns reusable capabilities. Packages cannot depend on apps.\nHosts explicitly select structural and visual CSS, own theme policy and provide content. Use public package exports, including in tests.\n'
  );
  mkdirSync(path.join(destination, '.github/workflows'), { recursive: true });
  writeFileSync(
    path.join(destination, '.github/workflows/ci.yml'),
    `name: Validate
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    env:
      NEXT_TELEMETRY_DISABLED: '1'
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version-file: .node-version
          cache: pnpm
      - run: pnpm install --frozen-lockfile
${hasPreparedInputs ? '      - run: pnpm app:prepare --all --source default\n' : ''}      - run: pnpm validate
${primary ? '      - run: pnpm exec playwright install --with-deps chromium\n      - run: pnpm test:e2e --all\n      - run: pnpm test:e2e:theme-policy\n' : ''}`
  );
}
