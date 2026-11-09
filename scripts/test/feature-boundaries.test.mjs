import assert from 'node:assert/strict';
import { symlinkSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { featureFixture } from './helpers/features.mjs';

test('undeclared folders stay unclassified; internal role folders need no barrels', (context) => {
  const f = featureFixture(context);
  delete f.workspace.manifest.workspaceFeatures;
  f.write('src/projects/browsing/index.ts', "export * from '../editing/index.js';");
  assert.deepEqual(f.check(), []);
});

test('outer composition uses public entries while feature-owned definitions stay local', (context) => {
  const f = featureFixture(context);
  f.write('src/index.ts', "export { browser } from './projects/index.js';");
  f.write('src/projects/index.ts', "export { browser } from './browsing/index.js';");
  f.write('src/projects/browsing/index.ts', "export { browser } from './internal.js';");
  f.write('src/projects/browsing/internal.ts', 'export const browser = {};');
  assert.deepEqual(f.check(), []);
});

for (const source of [
  "import { hidden } from './projects/browsing/internal.js';",
  "import type { Hidden } from './projects/browsing/internal.js';",
  "export type { Hidden } from './projects/browsing/internal.js';",
  "const pending = import('./projects/browsing/internal.js');",
  "type Hidden = import('./projects/browsing/internal.js').Hidden;",
]) {
  test('private imports are rejected in source and external tests: ' + source, (context) => {
    for (const file of ['src/consumer.ts', 'src/types.d.ts', 'test/consumer.spec.ts']) {
      const f = featureFixture(context);
      f.write(
        file,
        source.replaceAll(
          "'./projects",
          file.startsWith('test/') ? "'../src/projects" : "'./projects"
        )
      );
      assert.ok(f.check().some((error) => error.includes('declared public entry')));
    }
  });
}

test('sibling features cannot consume one another even through public entries', (context) => {
  const f = featureFixture(context);
  f.write('src/projects/browsing/index.ts', "import type { Edit } from '../editing/index.js';");
  assert.ok(f.check().some((error) => error.includes('unrelated features')));
});

test('nested children use ancestor shared contracts and parents compose public children', (context) => {
  const f = featureFixture(context);
  f.write('src/projects/browsing/detail/index.ts');
  f.scopes['src/projects/browsing/detail'] = { public: ['index.ts'] };
  f.write('src/projects/browsing/index.ts', "export * from './detail/index.js';");
  f.write(
    'src/projects/browsing/detail/index.ts',
    "import type { Project } from '../../schemas/index.js';"
  );
  assert.deepEqual(f.check(), []);
});

test('children cannot import an ancestor aggregator or private ancestor helpers', (context) => {
  for (const specifier of ['../index.js', '../private.js']) {
    const f = featureFixture(context);
    f.write('src/projects/private.ts');
    f.write('src/projects/browsing/index.ts', `export * from '${specifier}';`);
    assert.ok(f.check().some((error) => error.includes('ancestor shared entries only')));
  }
});

test('outer consumers cannot bypass an enclosing feature boundary with a child public path', (context) => {
  const f = featureFixture(context);
  f.write('src/consumer.ts', "import './projects/browsing/index.js';");
  assert.ok(f.check().some((error) => error.includes('@sample/library/src/projects:')));
  f.scopes['src/projects'].public.push('browsing/index.ts');
  assert.deepEqual(f.check(), []);
});

test('shared contracts cannot reach a child feature through an intermediate module', (context) => {
  const f = featureFixture(context);
  f.write('src/projects/schemas/index.ts', "export type { Project } from '../bridge.js';");
  f.write('src/projects/bridge.ts', "export type { Project } from './browsing/index.js';");
  assert.ok(f.check().some((error) => error.includes('shared capability reaches a feature')));
});

test('unscoped helpers cannot launder a feature dependency back into another feature', (context) => {
  const f = featureFixture(context);
  f.write('src/bridge.ts', "export * from './projects/index.js';");
  f.write('src/projects/browsing/index.ts', "import '../../bridge.js';");
  assert.ok(f.check().some((error) => error.includes('shared capability reaches a feature')));
});

test('neutral common capabilities and cycles among neutral helpers do not create feature edges', (context) => {
  const f = featureFixture(context);
  f.write('src/common/a.ts', "import './b.js';");
  f.write('src/common/b.ts', "import './a.js';");
  f.write('src/projects/browsing/index.ts', "import '../../common/a.js';");
  assert.deepEqual(f.check(), []);
});

test('tsconfig aliases and symlinks resolve to real private source ownership', (context) => {
  const f = featureFixture(context);
  f.write('src/consumer.ts', "import '@/projects/browsing/internal';");
  assert.ok(f.check().some((error) => error.includes('declared public entry')));
  const alias = path.join(f.workspace.directory, 'src/alias.ts');
  symlinkSync('projects/browsing/internal.ts', alias);
  f.workspace.files.push(alias);
  f.write('src/consumer.ts', "import './alias.js';");
  assert.ok(f.check().some((error) => error.includes('declared public entry')));
});

test('package subpaths and export patterns preserve source feature ownership before dist exists', (context) => {
  const f = featureFixture(context);
  f.workspace.manifest.exports = { './*': './dist/*.js' };
  f.write('src/consumer.ts', "import '@sample/library/projects/browsing/index';");
  assert.ok(f.check().some((error) => error.includes('declared public entry')));
  f.scopes['src/projects'].public.push('browsing/index.ts');
  assert.deepEqual(f.check(), []);
});

test('overlapping export patterns use the longest literal prefix for feature ownership', (context) => {
  for (const reverse of [false, true]) {
    const f = featureFixture(context);
    const entries = [
      ['./projects/*', './dist/projects/*.js'],
      ['./*/browsing/index', './dist/public.js'],
    ];
    f.workspace.manifest.exports = Object.fromEntries(reverse ? entries.reverse() : entries);
    f.write('src/public.ts');
    f.write('src/consumer.ts', "import '@sample/library/projects/browsing/index';");
    assert.ok(f.check().some((error) => error.includes('declared public entry')));
  }
});

test('JSON resources obey source scopes too', (context) => {
  const f = featureFixture(context);
  f.write('src/projects/browsing/data.json', { title: 'Neutral sample' });
  f.write('src/consumer.ts', "import './projects/browsing/data.json';");
  assert.ok(f.check().some((error) => error.includes('declared public entry')));
});

for (const declaration of [
  null,
  [],
  { '../outside': { public: ['index.ts'] } },
  { src: { public: [] } },
  { src: { public: ['missing.ts'] } },
  { src: { public: ['../tsconfig.json'] } },
  { src: { public: ['index.ts', 'index.ts'] } },
  { src: { public: ['index.ts'], typo: true } },
  { 'src/projects': { public: ['browsing'] } },
]) {
  test(
    'invalid or unsafe feature declarations fail instead of silently disabling checks: ' +
      JSON.stringify(declaration),
    (context) => {
      const f = featureFixture(context);
      f.workspace.manifest.workspaceFeatures = declaration;
      assert.ok(f.check().some((error) => error.includes('workspaceFeatures')));
    }
  );
}

test('public entry symlinks cannot escape their declared feature', (context) => {
  const f = featureFixture(context);
  symlinkSync(
    '../editing/index.ts',
    path.join(f.workspace.directory, 'src/projects/browsing/escape.ts')
  );
  f.scopes['src/projects/browsing'].public.push('escape.ts');
  assert.ok(f.check().some((error) => error.includes('symlink escapes')));
});

test('parent shared entries cannot relabel child APIs as neutral capabilities', (context) => {
  const f = featureFixture(context);
  f.scopes['src/projects'].shared.push('browsing/index.ts');
  assert.ok(f.check().some((error) => error.includes('shared entry cannot belong to a child')));
});

test('workspace public JSON entries still obey feature boundaries', (context) => {
  const f = featureFixture(context);
  f.write('src/projects/browsing/data.json', { title: 'Neutral sample' });
  f.workspace.manifest.exports = { './data': './dist/projects/browsing/data.json' };
  f.write('src/consumer.ts', "import '@sample/library/data';");
  assert.ok(f.check().some((error) => error.includes('declared public entry')));
});

test('explicit feature ownership also applies through another workspace public API', (context) => {
  const f = featureFixture(context);
  const other = featureFixture(context);
  other.workspace.manifest.name = '@sample/other';
  other.workspace.manifest.exports = { '.': './dist/projects/index.js' };
  f.workspaces.push(other.workspace);
  f.write('src/consumer.ts', "import '@sample/other';");
  assert.deepEqual(f.check(), []);
  f.write('src/projects/browsing/index.ts', "import '@sample/other';");
  assert.ok(f.check().some((error) => error.includes('unrelated features')));
});

test('cross-package neutral shared public capabilities are reusable without exposing business features', (context) => {
  const app = featureFixture(context);
  const library = featureFixture(context);
  library.workspace.manifest.name = '@sample/shared';
  library.workspace.manifest.exports = { '.': './dist/index.js' };
  library.workspace.manifest.workspaceFeatures = {
    src: { public: ['index.ts'], shared: ['index.ts'] },
  };
  library.write('src/index.ts', 'export const shared = {};');
  app.workspaces.push(library.workspace);
  app.write('src/projects/browsing/index.ts', "import {shared} from '@sample/shared';");
  assert.deepEqual(app.check(), []);
  library.workspace.manifest.workspaceFeatures['src/projects'] = { public: ['index.ts'] };
  library.write('src/index.ts', "export * from './projects/index.js';");
  assert.ok(app.check().some((error) => error.includes('shared capability reaches a feature')));
});

test('a cross-package shared subentry requires every enclosing public boundary', (context) => {
  const host = featureFixture(context);
  const library = featureFixture(context);
  library.workspace.manifest.name = '@sample/shared';
  library.workspace.manifest.exports = { './browsing': './dist/projects/browsing/index.js' };
  library.scopes['src/projects/browsing'].shared = ['index.ts'];
  host.workspaces.push(library.workspace);
  host.write('src/projects/editing/index.ts', "import '@sample/shared/browsing';");
  assert.ok(host.check().some((error) => error.includes('declared public entry')));
  library.scopes['src/projects'].public.push('browsing/index.ts');
  assert.deepEqual(host.check(), []);
});
