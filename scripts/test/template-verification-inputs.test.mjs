import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { withVerificationInputs } from '../templates/verification-inputs.mjs';

function fixture(context) {
  const root = mkdtempSync(path.join(tmpdir(), 'verification-inputs-test-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, value) => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
  };
  const apps = ['first', 'second'].map((id, index) => {
    const app = path.join(root, 'apps', id);
    write(path.join(app, 'package.json'), {
      workspaceKind: 'next-app',
      workspaceApp: {
        devPort: 3000 + index,
        testPort: 3100 + index,
        hostname: '127.0.0.1',
        testConfig: 'playwright.config.ts',
      },
    });
    write(path.join(app, 'playwright.config.ts'), 'export default {};\n');
    for (const kind of ['text', 'config']) {
      write(path.join(app, '.generated', kind, 'manifest.json'), {
        source: 'default',
        extra: 'Retain original bytes',
      });
      write(path.join(app, '.generated', kind, 'app.json'), ' { "original": true } \n');
      write(
        path.join(
          app,
          kind === 'text' ? 'content/default/text/en/main.json' : 'config/default/app.json'
        ),
        {}
      );
    }
    mkdirSync(path.join(app, '.generated/other'), { recursive: true });
    writeFileSync(path.join(app, '.generated/other/binary.bin'), Buffer.from([0, 1, 2, 255]));
    return app;
  });
  return { root, apps, write };
}
function files(root) {
  return Object.fromEntries(
    readdirSync(root, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const filename = path.join(entry.parentPath, entry.name);
        return [path.relative(root, filename), readFileSync(filename).toString('base64')];
      })
  );
}
test('rejecting a later custom source never prepares or alters any earlier default target', async (context) => {
  const f = fixture(context);
  f.write(path.join(f.apps[1], '.generated/config/manifest.json'), { source: 'custom' });
  f.write(path.join(f.apps[1], '.local/config/app.json'), { private: 'Untouched custom input' });
  const before = files(f.root);
  await assert.rejects(
    withVerificationInputs(f.apps, () => assert.fail('Preflight should reject')),
    /disposable\/default/
  );
  assert.deepEqual(files(f.root), before);
});
test('a preexisting local directory refuses verification without changing prepared defaults', async (context) => {
  const f = fixture(context);
  f.write(path.join(f.apps[0], '.local/keep.txt'), 'Keep local sources');
  const before = files(f.root);
  await assert.rejects(
    withVerificationInputs(f.apps, () => assert.fail('Preflight should reject')),
    /preexisting custom/
  );
  assert.deepEqual(files(f.root), before);
});
test('an interrupted verification restores original output bytes and manifests, and leaves unvisited targets alone', async (context) => {
  const f = fixture(context);
  const before = files(f.root);
  await assert.rejects(
    withVerificationInputs(f.apps, async (inputs) => {
      const app = f.apps[0];
      inputs.createCustom(app, {});
      inputs.setDevPort(app, 3200);
      f.write(path.join(app, '.generated/text/app.json'), { replaced: true });
      f.write(path.join(app, '.generated/text/manifest.json'), { source: 'custom' });
      f.write(path.join(app, '.generated/new/artifact.json'), { newlyCreated: true });
      f.write(
        path.join(app, 'AGENTS.md'),
        '<!-- BEGIN:nextjs-agent-rules -->\nGenerated rules\n<!-- END:nextjs-agent-rules -->\n'
      );
      throw new Error('Simulated command or browser failure');
    }),
    /Simulated/
  );
  assert.deepEqual(files(f.root), before);
  assert.equal(existsSync(path.join(f.apps[1], '.local')), false);
});
test('source-free production verification restores all sources and prepared files after success or failure', async (context) => {
  for (const fail of [false, true]) {
    const f = fixture(context);
    f.write(path.join(f.apps[0], 'AGENTS.md'), 'Developer rules must remain.\n');
    const before = files(f.root);
    const run = withVerificationInputs(f.apps, async (inputs) => {
      for (const app of f.apps) {
        inputs.createCustom(app, {});
        inputs.setDevPort(app, 3200);
        f.write(path.join(app, '.generated/config/app.json'), { temporary: true });
        inputs.hideSources(app);
        assert.equal(existsSync(path.join(app, '.generated')), false);
        assert.equal(existsSync(path.join(app, '.local')), false);
        assert.equal(existsSync(path.join(app, 'content/default')), false);
      }
      if (fail) throw new Error('Simulated production failure');
    });
    if (fail) await assert.rejects(run, /Simulated production/);
    else await run;
    assert.deepEqual(files(f.root), before);
  }
});

test('namespace custom verification can prepare and restore a dictionary', async (context) => {
  const f = fixture(context);
  const before = files(f.root);
  await withVerificationInputs(f.apps, async (inputs) => {
    inputs.createCustom(f.apps[0], {});
    f.write(path.join(f.apps[0], '.local/content/text/en/welcome.json'), {
      title: 'Namespace custom',
    });
    f.write(path.join(f.apps[0], '.generated/text/en/welcome.json'), { title: 'Prepared custom' });
  });
  assert.deepEqual(files(f.root), before);
});
