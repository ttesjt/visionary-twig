import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const HIDDEN_INPUTS = ['content/default', 'config/default', '.local', '.generated'];
const GENERATED_AGENT_RULES =
  /^<!-- BEGIN:nextjs-agent-rules -->[\s\S]*<!-- END:nextjs-agent-rules -->\s*$/;

function preflight(apps) {
  assert.equal(new Set(apps).size, apps.length, 'Verification targets must be distinct.');
  for (const app of apps) {
    for (const kind of [
      'text',
      'config',
      ...(existsSync(path.join(app, '.generated/content')) ? ['content'] : []),
    ])
      assert.equal(
        JSON.parse(readFileSync(path.join(app, '.generated', kind, 'manifest.json'), 'utf8'))
          .source,
        'default',
        'Verification requires disposable/default sources.'
      );
    assert.equal(
      existsSync(path.join(app, '.local')),
      false,
      'Refusing to overwrite preexisting custom data.'
    );
    assert.equal(
      existsSync(path.join(app, '.generated/prepare.lock')),
      false,
      'Preparation is in progress.'
    );
    for (const relative of HIDDEN_INPUTS)
      assert.equal(
        existsSync(path.join(app, relative + '.copy-verification')),
        false,
        'Verification backup already exists.'
      );
  }
}
/** Mutate only preflighted targets; always restore their exact prepared bytes, never run preparation as cleanup. */
export async function withVerificationInputs(apps, verify) {
  preflight(apps);
  const snapshots = mkdtempSync(path.join(tmpdir(), 'prepared-input-verification-'));
  const touched = new Map();
  const moved = [];
  const session = {
    createCustom(app, configuration) {
      assert.ok(
        apps.includes(app) && !touched.has(app),
        'Expected an untouched verification target.'
      );
      const backup = path.join(snapshots, String(touched.size));
      cpSync(path.join(app, '.generated'), backup, { recursive: true });
      // Claim ownership only after exclusive creation; a concurrent user's local directory is never removed.
      mkdirSync(path.join(app, '.local'));
      touched.set(app, {
        backup,
        manifest: null,
        ownedRules: !existsSync(path.join(app, 'AGENTS.md')),
      });
      for (const relative of ['content', 'config']) mkdirSync(path.join(app, '.local', relative));
      writeFileSync(path.join(app, '.local/config/app.json'), JSON.stringify(configuration));
    },
    setDevPort(app, port) {
      const state = touched.get(app);
      assert.ok(state, 'Expected an owned verification target.');
      const filename = path.join(app, 'package.json');
      state.manifest ??= readFileSync(filename);
      const manifest = JSON.parse(state.manifest.toString('utf8'));
      manifest.workspaceApp.devPort = port;
      writeFileSync(filename, JSON.stringify(manifest, null, 2) + '\n');
    },
    hideSources(app) {
      assert.ok(touched.has(app), 'Expected an owned verification target.');
      for (const relative of HIDDEN_INPUTS) {
        const source = path.join(app, relative);
        const backup = source + '.copy-verification';
        assert.equal(existsSync(backup), false);
        renameSync(source, backup);
        moved.push([source, backup]);
      }
    },
  };
  let result;
  let failed = false;
  let failure;
  try {
    result = await verify(session);
  } catch (error) {
    failed = true;
    failure = error;
  }
  const errors = [];
  const restore = (action) => {
    try {
      action();
    } catch (error) {
      errors.push(error);
    }
  };
  for (const [source, backup] of moved.reverse()) restore(() => renameSync(backup, source));
  for (const [app, state] of touched) {
    if (state.manifest)
      restore(() => writeFileSync(path.join(app, 'package.json'), state.manifest));
    restore(() => rmSync(path.join(app, '.local'), { recursive: true, force: true }));
    restore(() => {
      rmSync(path.join(app, '.generated'), { recursive: true, force: true });
      cpSync(state.backup, path.join(app, '.generated'), { recursive: true });
    });
    restore(() => {
      const rules = path.join(app, 'AGENTS.md');
      if (
        state.ownedRules &&
        existsSync(rules) &&
        GENERATED_AGENT_RULES.test(readFileSync(rules, 'utf8').trim())
      )
        rmSync(rules);
    });
  }
  if (errors.length)
    throw new AggregateError(
      failed ? [failure, ...errors] : errors,
      'Verification cleanup failed; original prepared files remain at ' + snapshots
    );
  rmSync(snapshots, { recursive: true, force: true });
  if (failed) throw failure;
  return result;
}
