import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { createTemplateProject } from '../templates/generate.mjs';
import { checkWorkspace } from '../lib/workspace-policy.mjs';
import { parse } from 'yaml';

const source = path.resolve(import.meta.dirname, '../..');
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
for (const webOnly of [false, true]) {
  test(
    'infrastructure survives ' +
      (webOnly ? 'Web-only' : 'two-app') +
      ' generation with renamed scope and hosts',
    async (context) => {
      const temporary = mkdtempSync(path.join(tmpdir(), 'infra-template-'));
      context.after(() => rmSync(temporary, { recursive: true, force: true }));
      const destination = path.join(temporary, 'project');
      await createTemplateProject(source, destination, {
        name: '@infra-check/starter',
        ...(webOnly
          ? { templates: ['plain-next'], appNames: { 'plain-next': 'public' } }
          : { appNames: { 'plain-next': 'public', studio: 'workbench' } }),
      });
      const lock = parse(readFileSync(path.join(destination, 'pnpm-lock.yaml'), 'utf8'));
      const workspace = parse(readFileSync(path.join(destination, 'pnpm-workspace.yaml'), 'utf8'));
      const tracker = json(path.join(destination, 'packages/shared/event-tracking/package.json'));
      assert.equal(tracker.name, '@infra-check/event-tracking');
      assert.deepEqual(tracker.dependencies ?? {}, {});
      for (const id of webOnly ? ['public'] : ['public', 'workbench']) {
        const manifest = json(path.join(destination, 'apps', id, 'package.json'));
        assert.equal(manifest.dependencies['@infra-check/event-tracking'], 'workspace:*');
        assert.equal(manifest.dependencies.swr, 'catalog:');
        assert.equal(
          lock.importers['apps/' + id].dependencies['@infra-check/event-tracking'].version,
          'link:../../packages/shared/event-tracking'
        );
        for (const excluded of ['.local', '.generated', '.next', 'node_modules', 'template'])
          assert.equal(
            existsSync(path.join(destination, 'apps', id, excluded)),
            false,
            id + '/' + excluded
          );
        assert.match(
          readFileSync(path.join(destination, 'apps', id, 'README.md'), 'utf8'),
          /Event tracking/
        );
      }
      assert.equal(
        workspace.catalog.swr,
        parse(readFileSync(path.join(source, 'pnpm-workspace.yaml'), 'utf8')).catalog.swr
      );
      assert.equal(
        existsSync(
          path.join(destination, 'apps/public/src/app/[locale]/examples/event-tracking/page.tsx')
        ),
        true
      );
      assert.equal(
        existsSync(
          path.join(destination, 'apps/public/src/app/[locale]/examples/remote-settings/page.tsx')
        ),
        true
      );
      assert.equal(
        existsSync(
          path.join(destination, 'apps/public/public/samples/remote-settings/compact.json')
        ),
        true
      );
      const client = readFileSync(
        path.join(destination, 'apps/public/src/infra/event-tracking/client.ts'),
        'utf8'
      );
      assert.match(client, /@infra-check\/event-tracking/);
      assert.doesNotMatch(client, /@frontend\//);
      const documentation = readFileSync(path.join(destination, 'docs/data-fetching.md'), 'utf8');
      assert.match(documentation, /@infra-check\/event-tracking/);
      assert.deepEqual(checkWorkspace(destination, { checkExports: false }), []);
      assert.equal(existsSync(path.join(destination, 'packages/site/studio')), !webOnly);
      assert.equal(
        existsSync(path.join(destination, 'packages/shared/event-tracking/dist')),
        false
      );
      assert.equal(existsSync(path.join(destination, 'packages/templates')), false);
      assert.equal(
        existsSync(path.join(destination, 'scripts/test/infrastructure-templates.test.mjs')),
        false
      );
    }
  );
}
