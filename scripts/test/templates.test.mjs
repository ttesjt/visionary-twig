import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';
import { copySource } from '../templates/files.mjs';
import { readTemplateCatalog } from '../templates/catalog.mjs';
import { planProject } from '../templates/plan.mjs';
import { createTemplateProject } from '../templates/generate.mjs';
import { targetFiles, rewritePackageNames } from '../templates/files.mjs';
import { mergeRequirements } from '../templates/root-project.mjs';
import { cloneOptions } from '../templates/options.mjs';
import { checkWorkspace } from '../lib/workspace-policy.mjs';
import {
  discoverApps,
  discoverTemplateApps,
  selectApp,
  appFilter,
} from '../../tooling/workspace-apps.ts';

const sourceRoot = path.resolve(import.meta.dirname, '../..');
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
function temporary(context) {
  const root = mkdtempSync(path.join(tmpdir(), 'frontend-template-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function fixture(context, entries) {
  const root = temporary(context);
  mkdirSync(path.join(root, 'packages/templates'), { recursive: true });
  writeFileSync(
    path.join(root, 'packages/templates/catalog.json'),
    JSON.stringify({ version: 1, templates: entries })
  );
  for (const entry of entries) {
    if (!entry.id || entry.id.includes('/')) continue;
    const directory = path.join(root, 'packages/templates', entry.id);
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({ name: '@sample/' + entry.id, workspaceKind: entry.kind })
    );
  }
  return root;
}
const sample = {
  id: 'sample',
  kind: 'next-app',
  destination: 'apps/sample',
  origin: { commit: 'a'.repeat(40), path: 'apps/sample' },
};

test('catalog and CLI reject malformed paths, names and conflicting selections', async (context) => {
  await assert.rejects(
    readTemplateCatalog(fixture(context, [{ ...sample, destination: '../outside' }])),
    /destination/
  );
  await assert.rejects(readTemplateCatalog(fixture(context, [sample, sample])), /duplicate/);
  await assert.rejects(
    readTemplateCatalog(
      fixture(context, [{ ...sample, origin: { commit: 'main', path: 'apps/sample' } }])
    ),
    /exact commit/
  );
  await assert.rejects(planProject(sourceRoot, { templates: ['missing'] }), /Unknown template/);
  await assert.rejects(planProject(sourceRoot, { name: 'unscoped' }), /scoped/);
  await assert.rejects(
    planProject(sourceRoot, { appNames: { studio: '../escape' } }),
    /destination/
  );
  await assert.rejects(planProject(sourceRoot, { appNames: { studio: 'plain' } }), /Colliding/);
  assert.throws(
    () => cloneOptions(['--output', '/tmp/x', '--app', 'studio=a', '--app', 'studio=b']),
    /distinct/
  );
  assert.throws(
    () => cloneOptions(['--output', '/tmp/x', '--no-install', '--browser']),
    /verification/
  );
});

test('source templates are independent apps without changing normal app discovery', () => {
  assert.deepEqual(
    json(path.join(sourceRoot, 'packages/templates/catalog.json'))
      .templates.map((entry) => entry.id)
      .sort(),
    ['node-library', 'plain-next', 'studio']
  );
  const originalApps = discoverApps(sourceRoot).map((app) => app.id);
  const sources = discoverTemplateApps(sourceRoot);
  assert.deepEqual(
    sources.map((app) => app.id),
    json(path.join(sourceRoot, 'packages/templates/catalog.json'))
      .templates.filter((entry) => entry.kind === 'next-app')
      .map((entry) => 'template-' + entry.id)
      .sort()
  );
  assert.deepEqual(
    discoverApps(sourceRoot).map((app) => app.id),
    originalApps
  );
  const ports = [...discoverApps(sourceRoot), ...sources].flatMap((app) => [
    app.devPort,
    app.testPort,
  ]);
  assert.equal(new Set(ports).size, ports.length);
  assert.equal(
    appFilter(sourceRoot, selectApp(sourceRoot, 'template-studio')),
    './packages/templates/studio'
  );
});

test('standalone clone ships portable standards and their linked files', async (context) => {
  const destination = path.join(temporary(context), 'project');
  await createTemplateProject(sourceRoot, destination, {
    templates: ['plain-next'],
    name: '@example/starter',
  });
  assert.equal(existsSync(path.join(destination, 'packages/shared/ui-document')), false);
  assert.equal(existsSync(path.join(destination, 'apps/studio')), false);
  for (const file of ['code-standards.md', 'monorepo-standards.md', 'repository-conventions.md']) {
    const relative = 'docs/' + file;
    const contents = readFileSync(path.join(destination, relative), 'utf8');
    assert.equal(contents, readFileSync(path.join(sourceRoot, relative), 'utf8'));
    for (const entry of ['AGENTS.md', 'README.md'])
      assert.ok(readFileSync(path.join(destination, entry), 'utf8').includes(relative));
    for (const [, target] of contents.matchAll(/\]\(([^)]+)\)/g)) {
      if (target.startsWith('https://')) continue;
      assert.ok(existsSync(path.resolve(destination, 'docs', target)), target);
    }
  }
  assert.equal(
    existsSync(path.join(destination, 'scripts/lib/feature-boundaries/check.mjs')),
    true
  );

  assert.deepEqual(checkWorkspace(destination, { checkExports: false }), []);
});

test('full clone uses template hooks and supports renamed scope and app directory', async (context) => {
  const destination = path.join(temporary(context), 'project');
  await createTemplateProject(sourceRoot, destination, {
    name: '@review/starter',
    appNames: { studio: 'editor' },
  });
  assert.deepEqual(
    discoverApps(destination).map((app) => app.id),
    ['editor', 'plain']
  );
  assert.equal(json(path.join(destination, 'package.json')).workspaceDefaultApp, 'plain');
  for (const absent of [
    'packages/adapters',
    'packages/templates',
    '.git',
    'scripts/templates',
    'scripts/test/page-error-verification.test.mjs',
    'scripts/clone-template.mjs',
    'apps/editor/template',
    'apps/editor/template.config.mjs',
    'packages/shared/ui/dist',
    'packages/shared/studio',
    'apps/editor/.generated',
    'apps/editor/.local',
  ])
    assert.equal(existsSync(path.join(destination, absent)), false, absent);
  const lock = parse(readFileSync(path.join(destination, 'pnpm-lock.yaml'), 'utf8'));
  const importers = Object.keys(lock.importers);
  assert.equal(
    importers.some(
      (id) => id.startsWith('packages/templates/') || id.startsWith('packages/adapters/')
    ),
    false
  );
  assert.deepEqual(importers.filter((id) => id.startsWith('packages/site/')).sort(), [
    'packages/site/studio',
  ]);
  assert.equal(
    lock.importers['apps/editor'].dependencies['@review/studio'].version,
    'link:../../packages/site/studio'
  );
  assert.equal(
    lock.importers['apps/editor'].dependencies['@review/ui'].version,
    'link:../../packages/shared/ui'
  );
  assert.equal(
    lock.importers['.'].devDependencies['@review/text-catalog'].version,
    'link:packages/shared/text-catalog'
  );
  assert.equal(lock.importers['.'].devDependencies['@frontend/text-catalog'], undefined);
  const rootManifest = json(path.join(destination, 'package.json'));
  for (const command of [
    'build:apps',
    'build:templates',
    'typecheck:all',
    'check:workspace:source',
    'lint:root',
    'app:migrate-profile',
    'data:migrate',
    'data:import',
    'data:check',
    'dev:cloud',
    'dev:local',
    'dev:studio:cloud',
    'dev:studio:local',
  ])
    assert.equal(rootManifest.scripts[command], undefined);
  assert.equal(existsSync(path.join(destination, 'scripts/run-workspace.mjs')), true);
  assert.equal(existsSync(path.join(destination, 'docs/commands.md')), true);
  const manifest = json(path.join(destination, 'apps/editor/package.json'));
  assert.equal(manifest.name, '@review/editor');
  assert.equal(
    manifest.scripts['app:prepare'],
    'node ../../scripts/prepare-app.mjs --kind app --app editor'
  );
  assert.equal(
    manifest.scripts['app:check'],
    'node ../../scripts/prepare-app.mjs --kind app --app editor --check'
  );
  assert.equal(
    existsSync(path.join(destination, 'apps/editor/content/default/text/en/main.json')),
    true
  );
  assert.match(
    readFileSync(path.join(destination, '.github/workflows/ci.yml'), 'utf8'),
    /pnpm app:prepare --all/
  );
  assert.equal(manifest.dependencies['@review/ui'], 'workspace:*');
  assert.equal(
    json(path.join(destination, 'apps/editor/tsconfig.json')).extends,
    '../../tsconfig.react.json'
  );
  assert.match(
    readFileSync(path.join(destination, 'apps/editor/playwright.config.ts'), 'utf8'),
    /'editor'/
  );
  assert.equal(json(path.join(destination, 'package.json')).scripts['dev'], 'node scripts/dev.mjs');
  assert.deepEqual(checkWorkspace(destination, { checkExports: false }), []);
  await assert.rejects(createTemplateProject(sourceRoot, destination), /already exists/);
  assert.equal(
    json(path.join(sourceRoot, 'packages/templates/studio/package.json')).name,
    '@frontend/template-studio'
  );
});

test('template requirements are ordered, cycles fail, and shared runtime packages need no hooks', async (context) => {
  const root = fixture(context, [sample, { ...sample, id: 'other', destination: 'apps/other' }]);
  writeFileSync(
    path.join(root, 'packages/templates/sample/template.config.mjs'),
    "export default {requires:['other']};"
  );
  const plan = await planProject(root, { templates: ['sample'] });
  assert.deepEqual(
    plan.templates.map((entry) => entry.id),
    ['other', 'sample']
  );
  const cycle = fixture(context, [sample]);
  writeFileSync(
    path.join(cycle, 'packages/templates/sample/template.config.mjs'),
    "export default {requires:['sample']};"
  );
  await assert.rejects(planProject(cycle, { templates: ['sample'] }), /cycle/);
});

test('hooks use bounded file helpers and conflicting root requirements fail explicitly', (context) => {
  const root = temporary(context);
  const files = targetFiles(root, root);
  assert.throws(() => files.write('../outside', 'bad'), /bounded/);
  const target = { scripts: { build: 'one' }, devDependencies: {}, catalog: {} };
  assert.throws(() => mergeRequirements(target, { scripts: { build: 'two' } }), /Conflicting/);
  mergeRequirements(target, { devDependencies: { helper: 'catalog:' } });
  assert.equal(target.devDependencies.helper, 'catalog:');
});

test('package mappings apply simultaneously and preserve unrelated package prefixes', (context) => {
  const directory = temporary(context);
  const file = path.join(directory, 'entry.ts');
  writeFileSync(file, "import '@source/a'; import '@source/b/schema'; import '@source/a-extra';");
  rewritePackageNames(directory, [
    ['@source/a', '@source/b'],
    ['@source/b', '@target/c'],
  ]);
  assert.equal(
    readFileSync(file, 'utf8'),
    "import '@source/b'; import '@target/c/schema'; import '@source/a-extra';"
  );
});

test('library-only generation does not require the app copy runtime', async (context) => {
  const destination = path.join(temporary(context), 'library');
  await createTemplateProject(sourceRoot, destination, { templates: ['node-library'] });
  const manifest = json(path.join(destination, 'package.json'));
  assert.equal(manifest.devDependencies['@frontend/text-catalog'], undefined);
  assert.equal(manifest.scripts['app:prepare'], undefined);
  assert.equal(manifest.scripts.validate.includes('app:check'), false);
  assert.deepEqual(checkWorkspace(destination, { checkExports: false }), []);
});

test('generation rejects provider SDKs even when install/verification is skipped', async (context) => {
  for (const group of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    const root = fixture(context, [sample]);
    const file = path.join(root, 'packages/templates/sample/package.json');
    writeFileSync(file, JSON.stringify({ ...json(file), [group]: { wrangler: '1.0.0' } }));
    await assert.rejects(planProject(root), /Provider SDKs cannot be cloned/);
  }
});

test('plain Next clone prepares namespace resources and AppConfig without restoring legacy runtime', async (context) => {
  const destination = path.join(temporary(context), 'plain');
  const plan = await createTemplateProject(sourceRoot, destination, {
    templates: ['plain-next'],
    name: '@plain-check/starter',
    appNames: { 'plain-next': 'welcome' },
  });
  assert.deepEqual(plan.packages.map((entry) => entry.manifest.name).sort(), [
    '@frontend/app-config',
    '@frontend/event-tracking',
    '@frontend/prepared-data',
    '@frontend/resource-runtime',
    '@frontend/styles',
    '@frontend/text-catalog',
    '@frontend/ui',
  ]);
  const app = json(path.join(destination, 'apps/welcome/package.json'));
  const rootManifest = json(path.join(destination, 'package.json'));
  for (const manifest of [app, rootManifest]) {
    for (const kind of ['text', 'config', 'app'])
      for (const operation of ['prepare', 'check'])
        assert.equal(typeof manifest.scripts[`${kind}:${operation}`], 'string');
  }
  assert.equal(app.workspaceApp.testHook, 'test/environment.mjs');
  assert.equal(app.scripts['demo:upstream'], 'node scripts/examples/mock-upstream.ts');
  assert.equal(existsSync(path.join(destination, 'docs/metadata.md')), true);
  assert.match(
    readFileSync(path.join(destination, 'apps/welcome/README.md'), 'utf8'),
    /## Metadata/
  );
  assert.equal(existsSync(path.join(destination, 'apps/welcome/.env.example')), true);
  assert.match(readFileSync(path.join(destination, '.gitignore'), 'utf8'), /!\.env\.example/);
  assert.equal(app.workspaceTextResources, true);
  assert.equal(app.workspaceAppConfig, true);
  assert.match(app.scripts['text:prepare'], /--app welcome/);
  assert.ok(app.devDependencies['@plain-check/app-config']);
  assert.equal(app.dependencies['@plain-check/app-config'], undefined);
  for (const absent of [
    'apps/welcome/src/providers',
    'apps/welcome/src/text',
    'apps/welcome/src/config',
    'apps/welcome/.generated',
    'apps/welcome/.local',
  ])
    assert.equal(existsSync(path.join(destination, absent)), false, absent);
  assert.match(
    readFileSync(path.join(destination, '.github/workflows/ci.yml'), 'utf8'),
    /app:prepare/
  );
  assert.deepEqual(checkWorkspace(destination, { checkExports: false }), []);
});

test('template copying keeps env examples and excludes private env files at every depth', (context) => {
  const root = temporary(context);
  const source = path.join(root, 'source');
  mkdirSync(path.join(source, 'nested'), { recursive: true });
  for (const folder of ['', 'nested']) {
    for (const name of ['.env', '.env.local', '.env.production.local', '.env.example']) {
      writeFileSync(
        path.join(source, folder, name),
        name === '.env.example'
          ? 'EXAMPLE_KEY=demo-only-key\n'
          : 'PRIVATE_KEY=copy-filter-test-secret\n'
      );
    }
  }
  const destination = path.join(root, 'output');
  copySource(source, destination);
  for (const folder of ['', 'nested']) {
    assert.equal(
      readFileSync(path.join(destination, folder, '.env.example'), 'utf8'),
      'EXAMPLE_KEY=demo-only-key\n'
    );
    for (const name of ['.env', '.env.local', '.env.production.local'])
      assert.equal(existsSync(path.join(destination, folder, name)), false);
  }
});
