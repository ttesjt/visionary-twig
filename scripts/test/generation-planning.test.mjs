import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { parse } from 'yaml';
import { createTemplateProject } from '../templates/generate.mjs';
import { planProject } from '../templates/plan.mjs';
import { assertNewDestination, readJson } from '../templates/files.mjs';
import { createWorkspaceRecord } from '../generation/record.mjs';
import { planTemplateAddition } from '../generation/planning.mjs';
import {
  mergeWorkspaceContributions,
  mergeAdapterBuildPermissions,
} from '../generation/contributions.mjs';

const source = path.resolve(import.meta.dirname, '../..');
const root = mkdtempSync(path.join(tmpdir(), 'generation-planning-'));
const base = path.join(root, 'base');
before(async () => {
  const plan = await createTemplateProject(source, base, {
    templates: [],
    allShared: true,
    name: '@planning/project',
  });
  createWorkspaceRecord(source, base, plan);
});
after(() => rmSync(root, { recursive: true, force: true }));
function target(context) {
  const folder = mkdtempSync(path.join(root, 'case-'));
  cpSync(base, folder, { recursive: true });
  context.after(() => rmSync(folder, { recursive: true, force: true }));
  return folder;
}
const write = (file, data) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data));
};

test('bare planning delivers all neutral shared packages without templates, site or provider catalog requirements', () => {
  const record = readJson(path.join(base, '.workspace-template.json'));
  assert.equal(record.applications.length, 0);
  const actualShared = readdirSync(path.join(source, 'packages/shared'), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(path.join(source, 'packages/shared', entry.name, 'package.json'))
    )
    .map((entry) => readJson(path.join(source, 'packages/shared', entry.name, 'package.json')).name)
    .sort();
  assert.deepEqual(Object.keys(record.packages).sort(), actualShared);
  assert.equal(existsSync(path.join(base, 'packages/templates')), false);
  assert.equal(existsSync(path.join(base, 'packages/adapters/cloudflare')), false);
  const workspace = parse(readFileSync(path.join(base, 'pnpm-workspace.yaml'), 'utf8'));
  assert.equal(workspace.catalog.wrangler, undefined);
  assert.equal(workspace.catalog['@cloudflare/workers-types'], undefined);
});
test('adding an app reuses compatible package contracts and preserves user implementation files', async (context) => {
  const folder = target(context);
  const file = path.join(folder, 'packages/shared/ui/src/user-owned.ts');
  writeFileSync(file, 'export const custom = true;\n');
  const result = await planTemplateAddition(source, folder, { appName: 'web' });
  assert.equal(result.newPackages.length, 0);
  assert.equal(result.plan.templates[0].packageName, '@planning/web');
  assert.equal(result.plan.templates[0].config.app.devPort, 3000);
  assert.equal(readFileSync(file, 'utf8'), 'export const custom = true;\n');
});
test('adding Studio to a bare workspace delivers the site package and keeps its app id', async (context) => {
  const folder = target(context);
  const { newPackages, plan } = await planTemplateAddition(source, folder, {
    template: 'studio',
    appName: 'studio',
  });
  assert.deepEqual(
    newPackages.map(({ destination }) => destination),
    ['packages/site/studio']
  );
  assert.equal(plan.templates[0].destination, 'apps/studio');
  assert.equal(plan.templates[0].packageName, '@planning/studio-app');
});
test('adding Studio reuses a compatible site package previously delivered under shared', async (context) => {
  const folder = path.join(target(context), 'older-project');
  const plan = await createTemplateProject(source, folder, {
    templates: ['studio'],
    name: '@planning/project',
  });
  const record = createWorkspaceRecord(source, folder, plan);
  const previous = 'packages/shared/studio';
  renameSync(path.join(folder, 'packages/site/studio'), path.join(folder, previous));
  record.packages['@frontend/studio'].destination = previous;
  write(path.join(folder, '.workspace-template.json'), record);

  const addition = await planTemplateAddition(source, folder, {
    template: 'studio',
    appName: 'editor',
  });
  assert.deepEqual(addition.newPackages, []);
  assert.equal(addition.plan.mapping.directories['packages/site/studio'], previous);
  assert.equal(
    addition.plan.packages.find((entry) => entry.manifest.name === '@frontend/studio').destination,
    previous
  );
});
test('existing directories, broken symlinks, ancestor symlinks and duplicate package names are refused', async (context) => {
  const folder = target(context);
  mkdirSync(path.join(folder, 'apps/web'));
  await assert.rejects(planTemplateAddition(source, folder, { appName: 'web' }), /already exists/);
  symlinkSync(path.join(folder, 'missing'), path.join(folder, 'apps/broken'));
  await assert.rejects(planTemplateAddition(source, folder, { appName: 'broken' }), /symlinks/);
  assert.throws(() => assertNewDestination(path.join(folder, 'apps/broken')), /already exists/);
  rmSync(path.join(folder, 'apps/broken'));
  const other = path.join(folder, 'packages/site/other');
  write(path.join(other, 'package.json'), { name: '@planning/duplicate' });
  await assert.rejects(
    planTemplateAddition(source, folder, { appName: 'duplicate' }),
    /Package name already exists/
  );
});
test('incompatible or unknown existing dependencies fail without changing their manifest', async (context) => {
  const folder = target(context);
  const file = path.join(folder, 'packages/shared/ui/package.json');
  const manifest = readJson(file);
  manifest.version = '99.0.0';
  write(file, manifest);
  const bytes = readFileSync(file);
  await assert.rejects(
    planTemplateAddition(source, folder, { appName: 'web' }),
    /Incompatible existing package/
  );
  assert.deepEqual(readFileSync(file), bytes);
});
test('port allocation accounts for every existing host and never changes its ports', async (context) => {
  const folder = target(context);
  write(path.join(folder, 'apps/old/package.json'), {
    name: '@planning/old',
    workspaceKind: 'next-app',
    workspaceApp: {
      hostname: '127.0.0.1',
      devPort: 3000,
      testPort: 3100,
      testConfig: 'playwright.config.ts',
    },
  });
  writeFileSync(path.join(folder, 'apps/old/playwright.config.ts'), '');
  const result = await planTemplateAddition(source, folder, { appName: 'web' });
  assert.equal(result.plan.templates[0].config.app.devPort, 3001);
  assert.equal(result.plan.templates[0].config.app.testPort, 3101);
  assert.equal(readJson(path.join(folder, 'apps/old/package.json')).workspaceApp.devPort, 3000);
});
test('delivery declarations include site and adapter dependency closures without changing runtime layer direction', async (context) => {
  const folder = path.join(root, 'extensions');
  context.after(() => rmSync(folder, { recursive: true, force: true }));
  write(path.join(folder, 'packages/templates/catalog.json'), {
    version: 1,
    templates: [
      {
        id: 'example',
        kind: 'next-app',
        destination: 'apps/example',
        origin: { commit: 'a'.repeat(40), path: 'packages/templates/example' },
      },
    ],
  });
  write(path.join(folder, 'packages/templates/example/package.json'), {
    name: '@source/template-example',
    workspaceKind: 'next-app',
  });
  writeFileSync(
    path.join(folder, 'packages/templates/example/template.config.mjs'),
    "export default { packages: ['@source/domain', '@source/vendor'] };\n"
  );
  write(path.join(folder, 'packages/shared/ports/package.json'), { name: '@source/ports' });
  write(path.join(folder, 'packages/site/domain/package.json'), {
    name: '@source/domain',
    dependencies: { '@source/ports': 'workspace:*' },
  });
  const adapter = path.join(folder, 'packages/adapters/vendor/package.json');
  write(adapter, {
    name: '@source/vendor',
    workspaceAdapter: { providerPackages: ['vendor-sdk'] },
    dependencies: { '@source/ports': 'workspace:*', 'vendor-sdk': '1.0.0' },
  });
  const plan = await planProject(folder, { templates: ['example'] });
  assert.deepEqual(
    plan.packages.map((entry) => entry.manifest.name),
    ['@source/ports', '@source/domain', '@source/vendor']
  );
  write(path.join(folder, 'packages/site/domain/package.json'), {
    name: '@source/domain',
    dependencies: { '@source/vendor': 'workspace:*' },
  });
  await assert.rejects(
    planProject(folder, { templates: ['example'] }),
    /cannot depend on adapters/
  );
});
test('root contributions preserve user fields and reject conflicting versions before any write', async (context) => {
  const folder = target(context);
  const manifestPath = path.join(folder, 'package.json');
  const manifest = readJson(manifestPath);
  const workspaceFile = path.join(folder, 'pnpm-workspace.yaml');
  writeFileSync(
    workspaceFile,
    '# user-owned workspace note\n' + readFileSync(workspaceFile, 'utf8')
  );
  manifest.customField = 'keep';
  manifest.workspaceDefaultApp = 'existing';
  write(manifestPath, manifest);
  const { plan } = await planTemplateAddition(source, folder, { appName: 'web' });
  // A root-only contribution needs no instantiated template manifest.
  mergeWorkspaceContributions(source, folder, { ...plan, packages: [], templates: [] }, [
    { scripts: { 'user:extra': 'node extra.mjs' } },
  ]);
  assert.equal(readJson(manifestPath).customField, 'keep');
  assert.match(readFileSync(workspaceFile, 'utf8'), /user-owned workspace note/);
  assert.equal(readJson(manifestPath).workspaceDefaultApp, 'existing');
  const before = readFileSync(manifestPath);
  assert.throws(
    () =>
      mergeWorkspaceContributions(source, folder, { ...plan, packages: [], templates: [] }, [
        { scripts: { validate: 'different' } },
      ]),
    /Conflicting root contribution/
  );
  assert.deepEqual(readFileSync(manifestPath), before);
});

test('adding a provider-free adapter does not alter unrelated existing SDK build permission', (context) => {
  const folder = target(context);
  const workspaceFile = path.join(folder, 'pnpm-workspace.yaml');
  const text = readFileSync(workspaceFile, 'utf8');
  writeFileSync(workspaceFile, text.replace('allowBuilds:', 'allowBuilds:\n  workerd: false'));
  const before = readFileSync(workspaceFile, 'utf8');
  mergeAdapterBuildPermissions(source, folder, {
    packages: [{ layer: 'adapter', source: path.join(source, 'packages/adapters/node-storage') }],
  });
  assert.equal(parse(readFileSync(workspaceFile, 'utf8')).allowBuilds.workerd, false);
  assert.equal(readFileSync(workspaceFile, 'utf8'), before);
});
