import assert from 'node:assert/strict';
import { test } from 'node:test';
import { featureFixture } from './helpers/features.mjs';

function sharedCapability(context, name) {
  const fixture = featureFixture(context);
  fixture.workspace.manifest.name = name;
  fixture.workspace.manifest.workspaceFeatures = {
    src: { public: ['index.ts'], shared: ['index.ts'] },
  };
  fixture.write('src/index.ts', "export * from './capability.js';");
  fixture.write('src/capability.ts');
  return fixture;
}

test('neutral shared public capabilities compose transitively, including dependency cycles', (context) => {
  const first = sharedCapability(context, '@sample/first');
  const second = sharedCapability(context, '@sample/second');
  const third = sharedCapability(context, '@sample/third');
  first.workspaces.push(second.workspace, third.workspace);
  first.write('src/capability.ts', "export * from '@sample/second';");
  second.write('src/capability.ts', "export * from '@sample/third';");
  third.write('src/capability.ts', "export * from '@sample/first';");
  assert.deepEqual(first.check(), []);
});

test('unscoped common helpers may consume another package shared public entry', (context) => {
  const host = featureFixture(context);
  const library = sharedCapability(context, '@sample/shared');
  host.workspaces.push(library.workspace);
  host.write('src/projects/browsing/index.ts', "import '../../common.js';");
  host.write('src/common.ts', "export * from '@sample/shared';");
  assert.deepEqual(host.check(), []);
});

for (const declaration of [
  { public: ['index.ts'] },
  { public: ['capability.ts'], shared: ['index.ts'] },
  { public: ['capability.ts'], shared: ['capability.ts'] },
]) {
  test(
    'cross-package capability entry must be both shared and public: ' + JSON.stringify(declaration),
    (context) => {
      const host = sharedCapability(context, '@sample/host');
      const library = sharedCapability(context, '@sample/library');
      library.workspace.manifest.workspaceFeatures.src = declaration;
      host.workspaces.push(library.workspace);
      host.write('src/capability.ts', "import '@sample/library';");
      const errors = host.check();
      assert.ok(errors.some((error) => error.includes('unrelated features')));
      assert.ok(errors.some((error) => error.includes('shared capability reaches a feature')));
    }
  );
}

test('approved shared dependencies cannot expose specialized children', (context) => {
  const host = sharedCapability(context, '@sample/host');
  const library = sharedCapability(context, '@sample/library');
  host.workspaces.push(library.workspace);
  host.write('src/capability.ts', "export * from '@sample/library';");
  library.workspace.manifest.workspaceFeatures['src/projects'] = { public: ['index.ts'] };
  library.write('src/capability.ts', "export * from './bridge.js';");
  library.write('src/bridge.ts', "export * from './projects/index.js';");
  const errors = host.check();
  assert.ok(
    errors.some(
      (error) =>
        error.includes('shared capability reaches a feature') &&
        error.includes('src/bridge.ts') &&
        error.includes('src/projects/index.ts')
    )
  );
});

test('approved shared dependencies cannot launder a foreign business feature through a helper', (context) => {
  const host = sharedCapability(context, '@sample/host');
  const library = sharedCapability(context, '@sample/library');
  const business = featureFixture(context);
  business.workspace.manifest.name = '@sample/business';
  business.workspace.manifest.exports = { '.': './dist/projects/index.js' };
  host.workspaces.push(library.workspace, business.workspace);
  host.write('src/capability.ts', "export * from '@sample/library';");
  library.write('src/capability.ts', "export * from '../common.js';");
  library.write('common.ts', "export * from '@sample/business';");
  assert.ok(
    host
      .check()
      .some(
        (error) =>
          error.includes('shared capability reaches a feature') && error.includes('common.ts')
      )
  );
});

test('shared public declarations do not permit same-workspace sibling feature dependencies', (context) => {
  const fixture = featureFixture(context);
  fixture.scopes['src/projects/editing'].shared = ['index.ts'];
  fixture.write('src/projects/browsing/index.ts', "import '../editing/index.js';");
  assert.ok(fixture.check().some((error) => error.includes('unrelated features')));
});
