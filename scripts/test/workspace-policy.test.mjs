import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
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
  write('packages/library/package.json', {
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
    write('packages/library/' + file, '');
  write('packages/library/tsconfig.json', {});
  write('packages/library/tsconfig.build.json', {});
  function styles(name) {
    write('packages/' + name + '/package.json', {
      name: '@example/' + name,
      private: true,
      type: 'module',
      workspaceKind: 'styles',
      exports: { './default.css': './src/default.css' },
      sideEffects: ['**/*.css'],
      scripts: { format: 'prettier --write .', 'format:check': 'prettier --check .' },
    });
    write('packages/' + name + '/README.md', '');
    write('packages/' + name + '/src/default.css', '');
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
  project.styles('layout-styles');
  project.styles('theme-styles');
  assert.deepEqual(project.check(), []);
});

test('rejects omitted test and typecheck scripts before builds exist', (context) => {
  const project = fixture(context);
  project.update('packages/library/package.json', (manifest) => {
    delete manifest.scripts.test;
    delete manifest.scripts.typecheck;
  });
  const errors = project.check();
  assert.ok(errors.some((error) => error.includes('missing required script "test"')));
  assert.ok(errors.some((error) => error.includes('missing required script "typecheck"')));
});

test('requires an explicit supported package kind', (context) => {
  const project = fixture(context);
  project.update('packages/library/package.json', (manifest) => {
    delete manifest.workspaceKind;
  });
  assert.ok(project.check().some((error) => error.includes('workspaceKind')));
});

test('separates source checks from checks for generated exports', (context) => {
  const project = fixture(context);
  assert.deepEqual(project.check(), []);
  assert.ok(checkWorkspace(project.root).some((error) => error.includes('missing public export')));
  project.write('packages/library/dist/index.js', 'export {};');
  assert.deepEqual(checkWorkspace(project.root), []);
});

test('allows CSS packages without code scripts and requires CSS side effects', (context) => {
  const project = fixture(context);
  project.styles('layout-styles');
  assert.deepEqual(project.check(), []);
  project.update('packages/layout-styles/package.json', (manifest) => {
    manifest.sideEffects = false;
  });
  assert.ok(project.check().some((error) => error.includes('preserve CSS side effects')));
});

test('rejects stylesheets outside a CSS workspace', (context) => {
  const project = fixture(context);
  project.write('packages/library/src/local.css', '.local {}');
  assert.ok(project.check().some((error) => error.includes('CSS belongs in a styles workspace')));
});

test('development dependencies cannot satisfy production source imports', (context) => {
  const project = fixture(context);
  project.update('packages/library/package.json', (manifest) => {
    manifest.devDependencies = { helper: '1.0.0' };
  });
  project.write('packages/library/src/index.test.ts', "import 'helper';");
  assert.deepEqual(project.check(), []);
  project.write('packages/library/src/index.ts', "import 'helper';");
  assert.ok(
    project.check().some((error) => error.includes('undeclared runtime dependency helper'))
  );
});

test('consumers must use public package exports', (context) => {
  const project = fixture(context);
  project.styles('layout-styles');
  project.update('packages/library/package.json', (manifest) => {
    manifest.dependencies = { '@example/layout-styles': 'workspace:*' };
  });
  project.write(
    'packages/library/src/index.ts',
    "import '@example/layout-styles/src/default.css';"
  );
  assert.ok(project.check().some((error) => error.includes('non-public export')));
});

test('source files cannot reach across workspace directories', (context) => {
  const project = fixture(context);
  project.write('packages/library/src/index.ts', "export * from '../../other/src/index.js';");
  assert.ok(project.check().some((error) => error.includes('crosses a package boundary')));
});

test('export patterns find built files and explicit private paths remain private', (context) => {
  const project = fixture(context);
  project.update('packages/library/package.json', (manifest) => {
    manifest.exports = { '.': './dist/index.js', './*': './dist/*.js', './private': null };
  });
  project.write('packages/library/dist/index.js', 'export {};');
  project.write('packages/library/dist/helper.js', 'export {};');
  project.write('packages/library/src/index.ts', "export * from '@example/library/helper';");
  assert.deepEqual(checkWorkspace(project.root), []);
  project.write('packages/library/src/index.ts', "export * from '@example/library/private';");
  assert.ok(project.check().some((error) => error.includes('non-public export')));
});

test('React browser sources reject Node builtins', (context) => {
  const project = fixture(context);
  project.update('packages/library/package.json', (manifest) => {
    manifest.workspaceKind = 'react-library';
    manifest.peerDependencies = { react: '^19.0.0' };
  });
  project.write('packages/library/src/index.ts', "import 'node:fs';");
  assert.ok(project.check().some((error) => error.includes('browser UI cannot import Node')));
});

test('Node libraries need runtime file extensions in relative imports', (context) => {
  const project = fixture(context);
  project.write('packages/library/src/index.ts', "export * from './helper';");
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
  project.update('packages/library/package.json', (manifest) => {
    manifest.dependencies = { '@example/web': 'workspace:*' };
  });
  assert.ok(
    project.check().some((error) => error.includes('packages cannot depend on application hosts'))
  );
});
