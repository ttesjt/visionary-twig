import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { checkTemplateFoundations } from '../templates/foundation.mjs';
import { readTemplateCatalog } from '../templates/catalog.mjs';
import { createTemplateProject } from '../templates/generate.mjs';
import { checkWorkspace } from '../lib/workspace-policy.mjs';

const source = path.resolve(import.meta.dirname, '../..');
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'template-foundation-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const entries = ['plain-next', 'specialized'].map((id) => ({
    id,
    kind: 'next-app',
    source: path.join(root, id),
  }));
  for (const entry of entries) {
    mkdirSync(path.join(entry.source, 'src/infra'), { recursive: true });
    mkdirSync(path.join(entry.source, 'src/site'), { recursive: true });
    writeFileSync(path.join(entry.source, 'src/infra/runtime.ts'), 'export const version = 1;\n');
    writeFileSync(path.join(entry.source, 'src/site/settings.ts'), 'export const settings = {};\n');
  }
  const write = (relative, value) => {
    const file = path.join(entries[1].source, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, value);
  };
  return { entries, write, check: () => checkTemplateFoundations(entries) };
}
test('all maintained Next templates share the exact foundation; library templates remain independent', async () => {
  const catalog = await readTemplateCatalog(source);
  assert.deepEqual(checkTemplateFoundations(catalog), []);
  assert.ok(catalog.some((entry) => entry.kind === 'node-library'));
});
test('site values, schemas and thin composition can differ without changing their stable entries', (t) => {
  const f = fixture(t);
  f.write(
    'src/site/settings.ts',
    'export const settings = { enabled: true }; export function chooseAdapter() { return settings; }\n'
  );
  f.write('src/site/project-data.ts', 'export const namespace = "projects";\n');
  assert.deepEqual(f.check(), []);
  unlinkSync(path.join(f.entries[1].source, 'src/site/settings.ts'));
  assert.match(f.check().join('\n'), /site declaration entry settings.ts/);
});
for (const change of ['byte', 'added', 'removed', 'mode', 'symlink'])
  test('rejects infrastructure drift: ' + change, (t) => {
    const f = fixture(t);
    const file = path.join(f.entries[1].source, 'src/infra/runtime.ts');
    if (change === 'byte') f.write('src/infra/runtime.ts', 'export const version = 1;\n\n');
    if (change === 'added') f.write('src/infra/extra.ts', '');
    if (change === 'removed') unlinkSync(file);
    if (change === 'mode') chmodSync(file, 0o755);
    if (change === 'symlink') {
      unlinkSync(file);
      symlinkSync(path.join(f.entries[0].source, 'src/infra/runtime.ts'), file);
    }
    assert.ok(f.check().length);
    assert.match(f.check().join('\n'), /infrastructure|src\/infra/);
  });
test('generated projects receive neither the checker nor its command and may customize infrastructure', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'independent-foundation-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const target = path.join(root, 'project');
  await createTemplateProject(source, target, {
    name: '@foundation/starter',
    templates: ['plain-next'],
    appNames: { 'plain-next': 'website' },
  });
  const manifest = JSON.parse(readFileSync(path.join(target, 'package.json'), 'utf8'));
  assert.equal(manifest.scripts['check:templates'], undefined);
  for (const file of [
    'scripts/check-template-foundation.mjs',
    'scripts/templates/foundation.mjs',
    'scripts/test/template-foundation.test.mjs',
  ])
    assert.equal(existsSync(path.join(target, file)), false);
  writeFileSync(
    path.join(target, 'apps/website/src/infra/user-extension.ts'),
    'export const customInfrastructure = true;\n'
  );
  assert.deepEqual(checkWorkspace(target, { checkExports: false }), []);
});

for (const [file, text] of [
  ['src/site/appearance.ts', 'export const APPEARANCE_POLICY = {};'],
  ['src/components/work.tsx', 'export function Work() { return useAppearance(); }'],
  ['src/app/page.tsx', "import { AppearanceDemoPicker } from '../demo/appearance';"],
  ['src/app/[locale]/layout.tsx', "import { useAppearance } from '../../demo/appearance/state';"],
  ['src/components/header.tsx', 'const attribute = "data-style-preview";'],
])
  test('rejects preview dependencies outside their owner: ' + file, (t) => {
    const f = fixture(t);
    f.write(file, text);
    assert.match(f.check().join('\n'), /appearance preview/);
  });
test('permits isolated preview code and explicit optional root-layout composition', (t) => {
  const f = fixture(t);
  f.write('src/demo/appearance/state.ts', 'export const APPEARANCE_POLICY = {};');
  f.write(
    'src/app/[locale]/layout.tsx',
    "import { AppearanceDemoPicker } from '../../demo/appearance';"
  );
  assert.deepEqual(f.check(), []);
});
test('the delivered Portfolio remains valid after removing the complete preview module and mounts', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'preview-removal-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const target = path.join(root, 'project');
  await createTemplateProject(source, target, {
    name: '@preview-removal/workspace',
    templates: ['portfolio'],
    appNames: { portfolio: 'website' },
  });
  const app = path.join(target, 'apps/website');
  const layout = path.join(app, 'src/app/[locale]/layout.tsx');
  const text = readFileSync(layout, 'utf8')
    .replace(
      /import\s*\{[^}]*AppearanceDemo[^}]*\}\s*from\s*['"][^'"]*demo\/appearance['"];?\s*/g,
      ''
    )
    .replace(/<AppearanceDemoBootstrap\s*\/>/g, '')
    .replace(/\s+preferenceExtensions=\{<AppearanceDemoPicker\s*\/>\}/g, '')
    .replace(/<head>\s*<\/head>/g, '');
  writeFileSync(layout, text);
  rmSync(path.join(app, 'src/demo/appearance'), { recursive: true, force: true });
  assert.doesNotMatch(text, /AppearanceDemo/);
  assert.deepEqual(checkWorkspace(target, { checkExports: false }), []);
});
