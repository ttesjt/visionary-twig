import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkWorkspace } from '../lib/workspace-policy.mjs';

function fixture(context) {
  const root = mkdtempSync(path.join(tmpdir(), 'workspace-policy-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  function write(file, value) {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
  }
  function update(file, change) {
    const manifest = JSON.parse(readFileSync(path.join(root, file), 'utf8'));
    change(manifest);
    write(file, manifest);
  }
  write('package.json', { name: '@example/workspace' });
  write('packages/shared/library/package.json', {
    name: '@example/library',
    private: true,
    type: 'module',
    workspaceKind: 'node-library',
    exports: { '.': { import: './dist/index.js' } },
    scripts: {
      build: 'tsc --build tsconfig.build.json',
      clean: 'rm -rf dist',
      dev: 'tsc --watch',
      typecheck: 'tsc --noEmit',
      lint: 'eslint .',
      'lint:fix': 'eslint . --fix',
      test: 'vitest run',
      'test:watch': 'vitest',
      'test:coverage': 'vitest run --coverage',
      format: 'prettier --write .',
      'format:check': 'prettier --check .',
    },
  });
  for (const file of ['README.md', 'src/index.ts', 'vitest.config.ts'])
    write('packages/shared/library/' + file, '');
  write('packages/shared/library/tsconfig.json', {});
  write('packages/shared/library/tsconfig.build.json', {});
  function styles(name) {
    write('packages/shared/' + name + '/package.json', {
      name: '@example/' + name,
      private: true,
      type: 'module',
      workspaceKind: 'styles',
      exports: { './default.css': './src/default.css' },
      sideEffects: ['**/*.css'],
      scripts: { format: 'prettier --write .', 'format:check': 'prettier --check .' },
    });
    write('packages/shared/' + name + '/README.md', '');
    write('packages/shared/' + name + '/src/default.css', '');
  }
  return {
    root,
    write,
    update,
    styles,
    check: () => checkWorkspace(root, { checkExports: false }),
  };
}

test('accepts source-only libraries and multiple CSS packages in another scope', (context) => {
  const project = fixture(context);
  project.styles('structure-css');
  project.styles('theme-styles');
  assert.deepEqual(project.check(), []);
});

test('rejects omitted test and typecheck scripts before builds exist', (context) => {
  const project = fixture(context);
  project.update('packages/shared/library/package.json', (manifest) => {
    delete manifest.scripts.test;
    delete manifest.scripts.typecheck;
  });
  const errors = project.check();
  assert.ok(errors.some((error) => error.includes('missing required script "test"')));
  assert.ok(errors.some((error) => error.includes('missing required script "typecheck"')));
});

test('requires an explicit supported package kind', (context) => {
  const project = fixture(context);
  project.update('packages/shared/library/package.json', (manifest) => {
    delete manifest.workspaceKind;
  });
  assert.ok(project.check().some((error) => error.includes('workspaceKind')));
});

test('separates source checks from checks for generated exports', (context) => {
  const project = fixture(context);
  assert.deepEqual(project.check(), []);
  assert.ok(checkWorkspace(project.root).some((error) => error.includes('missing public export')));
  project.write('packages/shared/library/dist/index.js', 'export {};');
  assert.deepEqual(checkWorkspace(project.root), []);
});

test('allows CSS packages without code scripts and requires CSS side effects', (context) => {
  const project = fixture(context);
  project.styles('structure-css');
  assert.deepEqual(project.check(), []);
  project.update('packages/shared/structure-css/package.json', (manifest) => {
    manifest.sideEffects = false;
  });
  assert.ok(project.check().some((error) => error.includes('preserve CSS side effects')));
});

test('rejects stylesheets outside a CSS workspace', (context) => {
  const project = fixture(context);
  project.write('packages/shared/library/src/local.css', '.local {}');
  assert.ok(project.check().some((error) => error.includes('CSS belongs in a styles workspace')));
});

test('React packages ship explicit CSS entries and leave CSS imports to hosts', (context) => {
  const project = fixture(context);
  const manifestPath = 'packages/shared/library/package.json';
  const stylesheetPath = 'packages/shared/library/src/styles/default.css';
  project.update(manifestPath, (manifest) => {
    manifest.workspaceKind = 'react-library';
    manifest.peerDependencies = { react: '^19.0.0' };
    manifest.exports['./default.css'] = './src/styles/default.css';
    manifest.files = ['dist', 'src/styles'];
    manifest.sideEffects = ['**/*.css'];
  });
  project.write(stylesheetPath, '.ui-button {}');
  assert.deepEqual(project.check(), []);

  project.write('packages/shared/library/src/index.ts', "import './styles/default.css';");
  assert.ok(
    project.check().some((error) => error.includes('application entries select stylesheets'))
  );
});

test('rejects missing CSS targets, omitted source files and unsafe side effects', (context) => {
  const project = fixture(context);
  project.update('packages/shared/library/package.json', (manifest) => {
    manifest.workspaceKind = 'react-library';
    manifest.peerDependencies = { react: '^19.0.0' };
    manifest.exports['./default.css'] = './src/styles/missing.css';
    manifest.files = ['dist'];
    manifest.sideEffects = false;
  });
  const errors = project.check();
  assert.ok(errors.some((error) => error.includes('CSS exports must target a source stylesheet')));
  assert.ok(errors.some((error) => error.includes('include CSS sources in package files')));
  assert.ok(errors.some((error) => error.includes('preserve CSS side effects')));
});

test('development dependencies cannot satisfy production source imports', (context) => {
  const project = fixture(context);
  project.update('packages/shared/library/package.json', (manifest) => {
    manifest.devDependencies = { helper: '1.0.0' };
  });
  project.write('packages/shared/library/src/index.test.ts', "import 'helper';");
  assert.deepEqual(project.check(), []);
  project.write('packages/shared/library/src/index.ts', "import 'helper';");
  assert.ok(
    project.check().some((error) => error.includes('undeclared runtime dependency helper'))
  );
});

test('consumers must use public package exports', (context) => {
  const project = fixture(context);
  project.styles('structure-css');
  project.update('packages/shared/library/package.json', (manifest) => {
    manifest.dependencies = { '@example/structure-css': 'workspace:*' };
  });
  project.write(
    'packages/shared/library/src/index.ts',
    "import '@example/structure-css/src/default.css';"
  );
  assert.ok(project.check().some((error) => error.includes('non-public export')));
});

for (const [label, source] of [
  ['type imports', "import type { Hidden } from '@example/library/private';"],
  ['named re-exports', "export { hidden } from '@example/library/private';"],
  ['type re-exports', "export type { Hidden } from '@example/library/private';"],
  ['literal dynamic imports', "const pending = import('@example/library/private');"],
  ['type queries', "type Hidden = import('@example/library/private').Hidden;"],
]) {
  test(`public package boundaries also cover ${label} in source and tests`, (context) => {
    for (const relative of ['src/consumer.ts', 'test/consumer.spec.ts']) {
      const project = fixture(context);
      project.write('packages/shared/library/' + relative, source);
      assert.ok(project.check().some((error) => error.includes('non-public export')));
    }
  });
}

test('internal feature files can be imported directly without directory barrels', (context) => {
  const project = fixture(context);
  project.write('packages/shared/library/src/feature/value.ts', 'export const value = 1;');
  project.write(
    'packages/shared/library/src/index.ts',
    "export { value } from './feature/value.js';"
  );
  assert.deepEqual(project.check(), []);
});

test('source files cannot reach across workspace directories', (context) => {
  const project = fixture(context);
  project.write(
    'packages/shared/library/src/index.ts',
    "export * from '../../other/src/index.js';"
  );
  assert.ok(project.check().some((error) => error.includes('crosses a package boundary')));
});

test('export patterns find built files and explicit private paths remain private', (context) => {
  const project = fixture(context);
  project.update('packages/shared/library/package.json', (manifest) => {
    manifest.exports = { '.': './dist/index.js', './*': './dist/*.js', './private': null };
  });
  project.write('packages/shared/library/dist/index.js', 'export {};');
  project.write('packages/shared/library/dist/helper.js', 'export {};');
  project.write('packages/shared/library/src/index.ts', "export * from '@example/library/helper';");
  assert.deepEqual(checkWorkspace(project.root), []);
  project.write(
    'packages/shared/library/src/index.ts',
    "export * from '@example/library/private';"
  );
  assert.ok(project.check().some((error) => error.includes('non-public export')));
});

test('React browser sources reject Node builtins', (context) => {
  const project = fixture(context);
  project.update('packages/shared/library/package.json', (manifest) => {
    manifest.workspaceKind = 'react-library';
    manifest.peerDependencies = { react: '^19.0.0' };
  });
  project.write('packages/shared/library/src/index.ts', "import 'node:fs';");
  assert.ok(project.check().some((error) => error.includes('browser UI cannot import Node')));
});

test('Node libraries need runtime file extensions in relative imports', (context) => {
  const project = fixture(context);
  project.write('packages/shared/library/src/index.ts', "export * from './helper';");
  assert.ok(project.check().some((error) => error.includes('explicit runtime extensions')));
});

test('packages cannot declare dependencies on an application host', (context) => {
  const project = fixture(context);
  project.write('apps/web/package.json', {
    name: '@example/web',
    workspaceKind: 'next-app',
    private: true,
    type: 'module',
  });
  project.update('packages/shared/library/package.json', (manifest) => {
    manifest.dependencies = { '@example/web': 'workspace:*' };
  });
  assert.ok(
    project.check().some((error) => error.includes('packages cannot depend on application hosts'))
  );
});

test('shared packages reject site dependencies in every manifest group', (context) => {
  for (const group of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const project = fixture(context);
    project.styles('neutral');
    const source = path.join(project.root, 'packages/shared/neutral');
    const target = path.join(project.root, 'packages/site/neutral');
    mkdirSync(path.dirname(target), { recursive: true });
    renameSync(source, target);
    project.update('packages/shared/library/package.json', (manifest) => {
      manifest[group] = { '@example/neutral': 'workspace:*' };
    });
    assert.ok(
      project.check().some((error) => error.includes('shared packages cannot depend on site'))
    );
  }
});

test('shared test imports cannot reach site packages without declaring them', (context) => {
  const project = fixture(context);
  project.styles('neutral');
  mkdirSync(path.join(project.root, 'packages/site'), { recursive: true });
  renameSync(
    path.join(project.root, 'packages/shared/neutral'),
    path.join(project.root, 'packages/site/neutral')
  );
  project.write(
    'packages/shared/library/src/index.test.ts',
    "import '@example/neutral/default.css';"
  );
  assert.ok(project.check().some((error) => error.includes('shared packages cannot import site')));
});

test('site packages may consume shared libraries', (context) => {
  const project = fixture(context);
  project.styles('neutral');
  mkdirSync(path.join(project.root, 'packages/site'), { recursive: true });
  renameSync(
    path.join(project.root, 'packages/shared/neutral'),
    path.join(project.root, 'packages/site/neutral')
  );
  project.update('packages/site/neutral/package.json', (manifest) => {
    manifest.dependencies = { '@example/library': 'workspace:*' };
  });
  assert.deepEqual(project.check(), []);
});

test('inactive templates are excluded and cannot satisfy live workspace dependencies', (context) => {
  const project = fixture(context);
  project.write('packages/templates/sample/package.json', { name: '@example/sample' });
  assert.deepEqual(project.check(), []);
  project.update('packages/shared/library/package.json', (manifest) => {
    manifest.dependencies = { '@example/sample': 'workspace:*' };
  });
  assert.ok(project.check().some((error) => error.includes('unknown workspace dependency')));
});

test('old flat package locations are rejected instead of silently ignored', (context) => {
  const project = fixture(context);
  project.write('packages/misplaced/package.json', { name: '@example/misplaced' });
  assert.ok(
    project.check().some((error) => error.includes('live packages belong in packages/shared'))
  );
});

test('filesystem fixtures cannot bypass public package exports with repository paths', (context) => {
  const project = fixture(context);
  project.write(
    'packages/shared/library/src/index.test.ts',
    "new URL('../../../../packages/shared/other/dist/index.js', import.meta.url);"
  );
  assert.ok(project.check().some((error) => error.includes('not repository paths')));
});

test('text/config-enabled apps require inputs, explicit preparation and lifecycle checks', (context) => {
  const project = fixture(context);
  project.write('apps/web/package.json', {
    name: '@example/web',
    private: true,
    type: 'module',
    workspaceKind: 'next-app',
    workspaceTextResources: true,
    workspaceApp: {
      devPort: 3000,
      testPort: 3100,
      hostname: '127.0.0.1',
      testConfig: 'playwright.config.ts',
    },
    scripts: {},
  });
  project.write('apps/web/playwright.config.ts', '');
  let errors = project.check();
  assert.ok(errors.some((error) => error.includes('missing text command text:prepare')));
  assert.ok(errors.some((error) => error.includes('missing text file')));
  project.write('apps/web/text-resources.config.ts', '');
  project.write('apps/web/content/default/text/en/main.json', '{}');
  project.update('apps/web/package.json', (manifest) => {
    for (const key of [
      'text:prepare',
      'text:prepare:custom',
      'text:check',
      'app:prepare',
      'app:prepare:custom',
      'app:check',
    ])
      manifest.scripts[key] = 'node runner.mjs';
    for (const key of ['dev', 'build', 'typecheck', 'test'])
      manifest.scripts[key] = 'pnpm app:check && command';
  });
  errors = project.check();
  assert.equal(
    errors.some(
      (error) =>
        error.includes('missing text file') ||
        error.includes('text command') ||
        error.includes('must check prepared')
    ),
    false
  );
});

function placeLibrary(project, layer, id) {
  const original = JSON.parse(
    readFileSync(path.join(project.root, 'packages/shared/library/package.json'), 'utf8')
  );
  project.write('packages/' + layer + '/' + id + '/package.json', {
    ...original,
    name: '@example/' + id,
  });
  for (const file of [
    'README.md',
    'src/index.ts',
    'vitest.config.ts',
    'tsconfig.json',
    'tsconfig.build.json',
  ])
    project.write('packages/' + layer + '/' + id + '/' + file, '');
}
test('shared, site and templates reject adapter references in every dependency group', (context) => {
  for (const layer of ['shared', 'site', 'template'])
    for (const group of [
      'dependencies',
      'peerDependencies',
      'devDependencies',
      'optionalDependencies',
    ]) {
      const project = fixture(context);
      placeLibrary(project, 'adapters', 'vendor');
      const directory =
        layer === 'template' ? 'packages/templates/consumer' : 'packages/' + layer + '/consumer';
      if (layer === 'template') {
        project.write(directory + '/package.json', {
          name: '@example/consumer',
          workspaceKind: 'next-app',
          [group]: { '@example/vendor': 'workspace:*' },
        });
      } else {
        placeLibrary(project, layer, 'consumer');
        project.update(directory + '/package.json', (manifest) => {
          manifest[group] = { '@example/vendor': 'workspace:*' };
        });
      }
      assert.ok(
        project.check().some((error) => error.includes('cannot depend on adapters')),
        layer + '/' + group
      );
    }
});
test('adapter chains and SDK leakage cannot hide behind neutral helpers or tests', (context) => {
  const project = fixture(context);
  placeLibrary(project, 'shared', 'helper');
  placeLibrary(project, 'adapters', 'vendor');
  project.update('packages/shared/library/package.json', (manifest) => {
    manifest.devDependencies = { '@example/helper': 'workspace:*' };
  });
  project.update('packages/shared/helper/package.json', (manifest) => {
    manifest.optionalDependencies = { '@example/vendor': 'workspace:*' };
  });
  assert.ok(
    project
      .check()
      .some((error) => error.includes('@example/library -> @example/helper -> @example/vendor'))
  );
  project.write(
    'packages/shared/library/src/index.test.ts',
    "import '@example/vendor'; import 'wrangler';"
  );
  assert.ok(
    project.check().some((error) => error.includes('provider SDK imports belong in adapters'))
  );
  assert.ok(project.check().some((error) => error.includes('cannot depend on adapters')));
});
test('adapters reject domain/application dependencies while accepting neutral ports', (context) => {
  const project = fixture(context);
  placeLibrary(project, 'adapters', 'vendor');
  project.update('packages/adapters/vendor/package.json', (manifest) => {
    manifest.dependencies = { '@example/library': 'workspace:*' };
  });
  assert.deepEqual(project.check(), []);
  placeLibrary(project, 'site', 'domain');
  project.update('packages/adapters/vendor/package.json', (manifest) => {
    manifest.devDependencies = { '@example/domain': 'workspace:*' };
  });
  assert.ok(
    project.check().some((error) => error.includes('adapters can only depend on neutral shared'))
  );
});
test('provider SDK dependencies stay inside their adapters, including dev-only imports', (context) => {
  const project = fixture(context);
  placeLibrary(project, 'adapters', 'vendor');
  project.update('packages/adapters/vendor/package.json', (manifest) => {
    manifest.workspaceAdapter = { providerPackages: ['provider-sdk'] };
    manifest.dependencies = { 'provider-sdk': '1.0.0' };
  });
  assert.deepEqual(project.check(), []);
  project.update('packages/shared/library/package.json', (manifest) => {
    manifest.devDependencies = { 'provider-sdk': '1.0.0' };
  });
  assert.ok(
    project.check().some((error) => error.includes('provider SDK dependencies belong in adapters'))
  );
});
test('TextCatalog hosts enforce UI keys after renaming, without requiring application data', (context) => {
  const project = fixture(context);
  const manifest = {
    name: '@other/custom-tool',
    workspaceKind: 'next-app',
    workspaceTextResources: true,
  };
  project.write('apps/custom-tool/package.json', manifest);
  project.write('apps/custom-tool/src/cases/panel.tsx', '<button>Open editor</button>');
  assert.ok(project.check().some((error) => error.includes('UI text must come from TextCatalog')));
  project.write(
    'apps/custom-tool/src/cases/panel.tsx',
    '<button>{text.getText("main", "openEditor")}</button>'
  );
  assert.ok(!project.check().some((error) => error.includes('UI text must come from TextCatalog')));
});

test('workspace source checks execute explicitly declared feature boundaries', (context) => {
  const project = fixture(context);
  project.update('packages/shared/library/package.json', (manifest) => {
    manifest.workspaceFeatures = { 'src/feature': { public: ['index.ts'] } };
  });
  project.write('packages/shared/library/src/feature/index.ts', 'export {};');
  project.write('packages/shared/library/src/feature/private.ts', 'export {};');
  project.write('packages/shared/library/src/index.ts', "export * from './feature/private.js';");
  assert.ok(project.check().some((error) => error.includes('declared public entry')));
  project.write('packages/shared/library/src/index.ts', "export * from './feature/index.js';");
  assert.deepEqual(project.check(), []);
});

test('namespace resource hosts require their declarations and prepared lifecycle checks', (context) => {
  const project = fixture(context);
  project.write('apps/web/package.json', {
    name: '@example/web',
    private: true,
    type: 'module',
    workspaceKind: 'next-app',
    workspaceTextResources: true,
    workspaceApp: {
      devPort: 3000,
      testPort: 3100,
      hostname: '127.0.0.1',
      testConfig: 'playwright.config.ts',
    },
    scripts: {},
  });
  project.write('apps/web/playwright.config.ts', '');
  let errors = project.check();
  assert.ok(errors.some((error) => error.includes('missing text file text-resources.config.ts')));
  assert.ok(errors.some((error) => error.includes('must check prepared app inputs')));
  project.write('apps/web/text-resources.config.ts', '');
  project.write('apps/web/content/default/text/en/common.json', '{}');
  project.update('apps/web/package.json', (manifest) => {
    for (const key of ['text:prepare', 'text:check', 'app:prepare', 'app:check'])
      manifest.scripts[key] = 'node runner.mjs';
    for (const key of ['dev', 'build', 'typecheck', 'test'])
      manifest.scripts[key] = 'pnpm app:check && command';
  });
  errors = project.check();
  assert.equal(
    errors.some((error) =>
      /missing text file|missing text command|must check prepared/.test(error)
    ),
    false
  );
});

test('namespace Text hosts reject inline JSX and labels across old and new pages', (context) => {
  const project = fixture(context);
  project.write('apps/namespace/package.json', {
    name: '@other/namespace',
    workspaceKind: 'next-app',
    workspaceTextResources: true,
  });
  project.write(
    'apps/namespace/src/components/action.tsx',
    '<button aria-label="Run action">Run</button>'
  );
  assert.ok(project.check().some((error) => error.includes('UI text must come from TextCatalog')));
  assert.ok(project.check().some((error) => error.includes('UI labels must use TextCatalog')));
  project.write(
    'apps/namespace/src/components/action.tsx',
    '<button aria-label={text.getText("controls", "run")}>{text.getText("controls", "run")}</button>'
  );
  assert.ok(!project.check().some((error) => /UI text must|UI labels must/.test(error)));
});

test('source checks accept declaration-owned Config/Content paths without executing configuration', (context) => {
  const p = fixture(context);
  const library = JSON.parse(
    readFileSync(path.join(p.root, 'packages/shared/library/package.json'), 'utf8')
  );
  p.write('apps/settings/package.json', {
    ...library,
    name: '@example/settings',
    workspaceKind: 'next-app',
    exports: undefined,
    workspaceAppConfig: true,
    workspaceContentResources: true,
    workspaceApp: {
      devPort: 3000,
      testPort: 3100,
      hostname: '127.0.0.1',
      testConfig: 'playwright.config.ts',
    },
    scripts: {
      ...library.scripts,
      start: 'next start',
      ...Object.fromEntries(
        ['dev', 'build', 'test', 'typecheck'].map((name) => [name, 'pnpm app:check && command'])
      ),
      ...Object.fromEntries(
        ['app', 'config', 'content'].flatMap((kind) =>
          ['prepare', 'check'].map((action) => [kind + ':' + action, 'node runner.mjs'])
        )
      ),
    },
  });
  for (const name of ['README.md', 'tsconfig.json', 'vitest.config.ts', 'playwright.config.ts'])
    p.write('apps/settings/' + name, '');
  // Source policy is build-independent; actual input resolution is enforced by app:check.
  // Re-exports/computed definitions are valid and must not be guessed from a source AST.
  p.write('apps/settings/config.config.ts', "export {default} from './definitions.ts';");
  p.write('apps/settings/content-resources.config.ts', "export {default} from './definitions.ts';");
  p.write(
    'apps/settings/definitions.ts',
    "export default {version:1,resources:{settings:{defaults:'resources/settings.json',custom:'.local/settings.json'}}};"
  );
  p.write('apps/settings/resources/settings.json', '{}');
  assert.deepEqual(p.check(), []);
});
