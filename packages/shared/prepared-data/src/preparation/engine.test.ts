import { mkdtemp, mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { mergePreparedData } from '../index.js';
import { checkPrepared, commitPrepared, prepareData, resolvePrepared } from './engine.js';
import type { PreparedDefinition } from './contracts.js';
import { assertPreparedBasis, capturePreparedState } from './state.js';
vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  return { ...original, rename: vi.fn(original.rename) };
});
let app: string;
const schema = z.strictObject({
  title: z.string(),
  image: z.strictObject({ url: z.string() }).optional(),
  items: z.array(z.string()),
});
const definition: PreparedDefinition = {
  namespace: 'settings',
  filename: 'app.json',
  contractVersion: 1,
  async resolve(read, source) {
    const defaults = schema.parse(await read('default.json'));
    return schema.parse(
      source === 'custom'
        ? mergePreparedData(defaults, await read('.local/override.json'))
        : defaults
    );
  },
};
beforeEach(async () => {
  app = await mkdtemp(path.join(tmpdir(), 'prepared-data-'));
  await writeFile(
    path.join(app, 'default.json'),
    JSON.stringify({ title: 'Default', items: ['one', 'two'] })
  );
  await mkdir(path.join(app, '.local'));
});
afterEach(async () => {
  await rm(app, { recursive: true, force: true });
});
it('adds schema-approved optional fields, replaces arrays and keeps custom sources untouched', async () => {
  const custom = JSON.stringify({ image: { url: '/image.svg' }, items: ['replacement'] });
  await writeFile(path.join(app, '.local/override.json'), custom);
  await prepareData(app, definition, 'custom');
  expect(
    JSON.parse(await readFile(path.join(app, '.generated/settings/app.json'), 'utf8'))
  ).toEqual({ title: 'Default', image: { url: '/image.svg' }, items: ['replacement'] });
  expect(await checkPrepared(app, definition)).toBe('custom');
  expect(await readFile(path.join(app, '.local/override.json'), 'utf8')).toBe(custom);
});
it('default does not read custom files; explicit missing custom and unknown keys fail', async () => {
  await writeFile(path.join(app, '.local/override.json'), 'invalid JSON');
  await prepareData(app, definition, 'default');
  await expect(prepareData(app, definition, 'custom')).rejects.toThrow();
  await rm(path.join(app, '.local/override.json'));
  await expect(prepareData(app, definition, 'custom')).rejects.toThrow();
  await writeFile(path.join(app, '.local/override.json'), '{"typo":true}');
  await expect(prepareData(app, definition, 'custom')).rejects.toThrow();
  expect(await checkPrepared(app, definition)).toBe('default');
});
it('failed resolution preserves the previous valid directory; freshness checks inputs, artifacts, source and explicit contract version', async () => {
  await prepareData(app, definition, 'default');
  const file = path.join(app, '.generated/settings/app.json');
  const previous = await readFile(file, 'utf8');
  await writeFile(path.join(app, '.local/override.json'), '{"title":42}');
  await expect(prepareData(app, definition, 'custom')).rejects.toThrow();
  expect(await readFile(file, 'utf8')).toBe(previous);
  await expect(checkPrepared(app, definition, 'custom')).rejects.toThrow(/source/i);
  await expect(checkPrepared(app, { ...definition, contractVersion: 2 })).rejects.toThrow(
    /version/i
  );
  await writeFile(file, '{}');
  await expect(checkPrepared(app, definition)).rejects.toThrow(/stale/);
  await prepareData(app, definition, 'default');
  await writeFile(path.join(app, 'default.json'), '{"title":"Changed","items":[]}');
  await expect(checkPrepared(app, definition)).rejects.toThrow(/stale/);
});
it('uses one lock across namespaces and rejects duplicate transaction outputs', async () => {
  const resolved = await resolvePrepared(app, definition, 'default');
  await mkdir(path.join(app, '.generated'));
  await mkdir(path.join(app, '.generated/prepare.lock'));
  await expect(commitPrepared(app, [resolved])).rejects.toThrow(/running/);
  await expect(commitPrepared(app, [resolved, resolved])).rejects.toThrow(/Duplicate/);
});
it('rejects traversal and symlinks in input/output directories', async () => {
  const outside = await mkdtemp(path.join(tmpdir(), 'prepared-outside-'));
  try {
    await writeFile(path.join(outside, 'default.json'), '{"title":"Outside","items":[]}');
    await rm(path.join(app, 'default.json'));
    await symlink(path.join(outside, 'default.json'), path.join(app, 'default.json'));
    await expect(prepareData(app, definition, 'default')).rejects.toThrow(/symlink/);
    await rm(path.join(app, 'default.json'));
    await writeFile(path.join(app, 'default.json'), '{"title":"Inside","items":[]}');
    await symlink(outside, path.join(app, '.generated'));
    await expect(prepareData(app, definition, 'default')).rejects.toThrow(/symlink/);
    await expect(
      resolvePrepared(app, { ...definition, resolve: (read) => read('../escape.json') })
    ).rejects.toThrow(/escapes/);
  } finally {
    await rm(outside, { recursive: true, force: true });
  }
});
it('rejects prototype-polluting objects at every nesting depth', () => {
  for (const raw of [
    '{"__proto__":{"polluted":true}}',
    '{"image":{"constructor":{}}}',
    '{"items":[{"prototype":{}}]}',
  ])
    expect(() => mergePreparedData({}, JSON.parse(raw))).toThrow(/Forbidden/);
  expect({}).not.toHaveProperty('polluted');
});
it('commits two validated namespaces together while preserving an unrelated namespace', async () => {
  const second = { ...definition, namespace: 'other' };
  await commitPrepared(app, [
    await resolvePrepared(app, definition, 'default'),
    await resolvePrepared(app, second, 'default'),
  ]);
  expect(await checkPrepared(app, definition)).toBe('default');
  expect(await checkPrepared(app, second)).toBe('default');
  await prepareData(app, definition, 'default');
  expect(await checkPrepared(app, second)).toBe('default');
});

it('rejects non-JSON schema results before replacing a valid artifact', async () => {
  await prepareData(app, definition, 'default');
  const before = await readFile(path.join(app, '.generated/settings/app.json'), 'utf8');
  for (const value of [new Date(), { callback: () => undefined }, { size: Infinity }]) {
    await expect(
      prepareData(app, { ...definition, resolve: () => Promise.resolve(value) }, 'default')
    ).rejects.toThrow(/JSON/);
  }
  expect(await readFile(path.join(app, '.generated/settings/app.json'), 'utf8')).toBe(before);
});

it('separates stage and backup names and rolls back an interrupted multi-artifact replacement', async () => {
  const second = { ...definition, namespace: 'settings-previous' };
  const originalRename = (
    await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
  ).rename;
  const definitions = [definition, second];
  await commitPrepared(
    app,
    await Promise.all(definitions.map((item) => resolvePrepared(app, item, 'default')))
  );
  await writeFile(path.join(app, 'default.json'), '{"title":"New","items":[]}');
  const artifacts = await Promise.all(
    definitions.map((item) => resolvePrepared(app, item, 'default'))
  );
  vi.mocked(rename).mockImplementation(async (from, to) => {
    if (String(from) === path.join(app, '.generated/prepare.lock/next', second.namespace))
      throw new Error('Simulated replacement interruption');
    return originalRename(from, to);
  });
  try {
    await expect(commitPrepared(app, artifacts)).rejects.toThrow(/interruption/);
    for (const item of definitions)
      expect(
        schema.parse(
          JSON.parse(
            await readFile(path.join(app, '.generated', item.namespace, 'app.json'), 'utf8')
          )
        ).title
      ).toBe('Default');
  } finally {
    vi.mocked(rename).mockImplementation(originalRename);
  }
  await commitPrepared(app, artifacts);
  for (const item of definitions) expect(await checkPrepared(app, item)).toBe('default');
});

it('guards the entire validation basis, including namespaces that were previously absent', async () => {
  const other = { ...definition, namespace: 'other' };
  const definitions = [definition, other];
  const empty = await capturePreparedState(app, definitions);
  const candidate = await resolvePrepared(app, definition, 'default');
  await prepareData(app, other, 'default');
  await expect(commitPrepared(app, [candidate], empty)).rejects.toThrow(
    /changed during validation/
  );
  await expect(readFile(path.join(app, '.generated/settings/app.json'))).rejects.toThrow(/ENOENT/);
  expect(await checkPrepared(app, other)).toBe('default');
  const current = await capturePreparedState(app, definitions);
  await commitPrepared(app, [candidate], current);
  expect(await checkPrepared(app, definition)).toBe('default');
});
it('checks artifact bytes as well as manifests under the lock and releases it after a stale-state rejection', async () => {
  await prepareData(app, definition, 'default');
  const state = await capturePreparedState(app, [definition]);
  const candidate = await resolvePrepared(app, definition, 'default');
  const artifact = path.join(app, '.generated/settings/app.json');
  const changed = JSON.stringify({ title: 'Externally changed', items: [] });
  await writeFile(artifact, changed);
  await expect(commitPrepared(app, [candidate], state)).rejects.toThrow(
    /changed during validation/
  );
  expect(await readFile(artifact, 'utf8')).toBe(changed);
  const refreshed = await capturePreparedState(app, [definition]);
  await commitPrepared(app, [candidate], refreshed);
  expect(await checkPrepared(app, definition)).toBe('default');
});
it('rejects capturing an active preparation and using another app validation state', async () => {
  await prepareData(app, definition, 'default');
  const state = await capturePreparedState(app, [definition]);
  await mkdir(path.join(app, '.generated/prepare.lock'));
  await expect(capturePreparedState(app, [definition])).rejects.toThrow(/in progress/);
  await rm(path.join(app, '.generated/prepare.lock'), { recursive: true });
  await expect(
    commitPrepared(app, [await resolvePrepared(app, definition, 'default')], {
      ...state,
      app: app + '-other',
    })
  ).rejects.toThrow(/different app/);
  expect(await checkPrepared(app, definition)).toBe('default');
});

it('binds the validated counterpart to its captured state even after another writer restores the old generation', async () => {
  await writeFile(path.join(app, '.local/override.json'), '{"title":"Other generation"}');
  await prepareData(app, definition, 'default');
  const state = await capturePreparedState(app, [definition]);
  const original = await resolvePrepared(app, definition, 'default');
  await prepareData(app, definition, 'custom');
  const other = await resolvePrepared(app, definition, 'custom');
  await prepareData(app, definition, 'default');
  // Original bytes are back, but a combination that used the intermediate values is still unsafe.
  expect(() => assertPreparedBasis(state, [other])).toThrow(/changed during resolution/);
  expect(() => assertPreparedBasis(state, [original])).not.toThrow();
  const second = { ...definition, namespace: 'other' };
  const absent = await capturePreparedState(app, [second]);
  expect(() => assertPreparedBasis(absent, [other])).toThrow(/changed during resolution/);
  expect(() => assertPreparedBasis(absent, [])).not.toThrow();
  expect(() => assertPreparedBasis(absent, [{ ...original, definition: second }])).not.toThrow();
});

it('tracks optional absence, additions, removals and invalid optional inputs in auto mode', async () => {
  const auto: PreparedDefinition = {
    ...definition,
    async resolve(read, source) {
      const defaults = await read('default.json');
      const override =
        source === 'default'
          ? undefined
          : await read('.local/optional.json', { optional: source === 'auto' });
      return schema.parse(
        override === undefined ? defaults : mergePreparedData(defaults, override)
      );
    },
  };
  await prepareData(app, auto);
  expect(await checkPrepared(app, auto)).toBe('auto');
  const resolved = await resolvePrepared(app, auto);
  expect(resolved.manifest.inputs['.local/optional.json']).toBeNull();
  await writeFile(path.join(app, '.local/optional.json'), '{}');
  await expect(checkPrepared(app, auto)).rejects.toThrow(/stale/);
  await prepareData(app, auto);
  await rm(path.join(app, '.local/optional.json'));
  await expect(checkPrepared(app, auto)).rejects.toThrow(/stale/);
  await prepareData(app, auto);
  await expect(prepareData(app, auto, 'custom')).rejects.toThrow(/ENOENT/);
  await writeFile(path.join(app, '.local/optional.json'), 'invalid');
  await expect(prepareData(app, auto)).rejects.toThrow();
  await prepareData(app, auto, 'default');
  expect(await checkPrepared(app, auto)).toBe('default');
});

it('optional reads reject directories, escaping paths and dangling symlinks', async () => {
  await mkdir(path.join(app, '.local/directory'));
  await symlink(path.join(app, 'missing.json'), path.join(app, '.local/link.json'));
  for (const file of ['.local/directory', '.local/link.json', '../escape.json']) {
    await expect(
      resolvePrepared(app, { ...definition, resolve: (read) => read(file, { optional: true }) })
    ).rejects.toThrow();
  }
});

it('commits nested resource files atomically, checks every byte and rejects unexpected output', async () => {
  const multi: PreparedDefinition = {
    ...definition,
    additionalFiles: (value) => ({ 'en/welcome.json': value }),
  };
  await prepareData(app, multi, 'default');
  const nested = path.join(app, '.generated/settings/en/welcome.json');
  expect(await checkPrepared(app, multi)).toBe('default');
  const state = await capturePreparedState(app, [multi]);
  await writeFile(nested, '{}');
  await expect(checkPrepared(app, multi)).rejects.toThrow(/stale/);
  await expect(commitPrepared(app, [await resolvePrepared(app, multi)], state)).rejects.toThrow(
    /changed during validation/
  );
  await prepareData(app, multi);
  const current = await capturePreparedState(app, [multi]);
  await writeFile(path.join(app, '.generated/settings/extra.json'), '{}');
  await expect(checkPrepared(app, multi)).rejects.toThrow(/inventory/);
  await expect(commitPrepared(app, [await resolvePrepared(app, multi)], current)).rejects.toThrow(
    /changed during validation/
  );
  await prepareData(app, {
    ...multi,
    additionalFiles: (value) => ({ 'zh/replacement.json': value }),
  });
  await expect(readFile(nested)).rejects.toThrow(/ENOENT/);
  await expect(readFile(path.join(app, '.generated/settings/extra.json'))).rejects.toThrow(
    /ENOENT/
  );
});
it('rejects unsafe additional paths and non-JSON projected values before replacing output', async () => {
  await prepareData(app, definition);
  const before = await readFile(path.join(app, '.generated/settings/app.json'), 'utf8');
  for (const filename of [
    '../escape.json',
    '/absolute.json',
    'a/../escape.json',
    'manifest.json',
    'app.json',
    'a\\escape.json',
  ])
    await expect(
      prepareData(app, { ...definition, additionalFiles: () => ({ [filename]: {} }) })
    ).rejects.toThrow(/Invalid/);
  await expect(
    prepareData(app, { ...definition, additionalFiles: () => ({ 'bad.json': { fn: () => 1 } }) })
  ).rejects.toThrow(/JSON/);
  expect(await readFile(path.join(app, '.generated/settings/app.json'), 'utf8')).toBe(before);
});

it('tracks module bytes, removes stale modules and preserves the whole output on failure', async () => {
  const modules: PreparedDefinition = {
    ...definition,
    additionalModules: () => ({ 'server-imports.ts': 'export const value = 1;\n' }),
  };
  await prepareData(app, modules);
  const output = path.join(app, '.generated/settings/server-imports.ts');
  expect(await checkPrepared(app, modules)).toBe('auto');
  await writeFile(output, 'changed');
  await expect(checkPrepared(app, modules)).rejects.toThrow(/modified/);
  await prepareData(app, modules);
  for (const filename of ['../outside.ts', '/outside.ts', 'other.js', 'a/../bad.ts']) {
    await expect(
      prepareData(app, { ...modules, additionalModules: () => ({ [filename]: '' }) })
    ).rejects.toThrow(/Invalid/);
    expect(await readFile(output, 'utf8')).toBe('export const value = 1;\n');
  }
  await prepareData(app, definition);
  await expect(readFile(output)).rejects.toThrow(/ENOENT/);
});

it('prepares plain-text sources with the same freshness and optional-absence guarantees', async () => {
  const notes: PreparedDefinition = {
    namespace: 'notes',
    filename: 'notes.json',
    contractVersion: 1,
    async resolve(read, source) {
      const defaults = await read('notes.md', { format: 'text' });
      const custom =
        source === 'default'
          ? undefined
          : await read('.local/notes.md', {
              format: 'text',
              optional: source === 'auto',
            });
      return { text: custom ?? defaults };
    },
  };
  await writeFile(path.join(app, 'notes.md'), '# A neutral note\n\nA plain-text source.');
  await prepareData(app, notes, 'auto');
  expect(await checkPrepared(app, notes)).toBe('auto');
  await writeFile(path.join(app, '.local/notes.md'), 'A custom note, not JSON.');
  await expect(checkPrepared(app, notes)).rejects.toThrow(/stale/i);
  await prepareData(app, notes, 'auto');
  expect(JSON.parse(await readFile(path.join(app, '.generated/notes/notes.json'), 'utf8'))).toEqual(
    { text: 'A custom note, not JSON.' }
  );
  await writeFile(path.join(app, '.local/notes.md'), 'Changed.');
  await expect(checkPrepared(app, notes)).rejects.toThrow(/stale/i);
  await prepareData(app, notes, 'default');
  const prepared = z
    .object({ text: z.string() })
    .parse(JSON.parse(await readFile(path.join(app, '.generated/notes/notes.json'), 'utf8')));
  expect(prepared.text).toContain('# A neutral note');
  await rm(path.join(app, '.local/notes.md'));
  await expect(prepareData(app, notes, 'custom')).rejects.toThrow();
});
