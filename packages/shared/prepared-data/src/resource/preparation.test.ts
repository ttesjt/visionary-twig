import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { jsonResourcesDefinition } from './node.js';
import { prepareData, checkPrepared } from '../node.js';
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});
it('prepares namespaces with optional overrides, identity and failure preservation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'json-resources-'));
  roots.push(root);
  await mkdir(path.join(root, 'data'), { recursive: true });
  await writeFile(path.join(root, 'data/base.json'), JSON.stringify({ items: ['Default'] }));
  const definition = jsonResourcesDefinition({
    version: 1,
    kind: 'content',
    resources: {
      base: {
        schema: z.object({ items: z.array(z.string()) }),
        schemaVersion: '1',
        defaults: 'data/base.json',
        custom: '.local/base.json',
      },
    },
  });
  await prepareData(root, definition);
  expect(await readFile(path.join(root, '.generated/content/server-imports.ts'), 'utf8')).toContain(
    'import("./base.json")'
  );
  const original = await readFile(path.join(root, '.generated/content/resources.json'), 'utf8');
  await mkdir(path.join(root, '.local'));
  await writeFile(path.join(root, '.local/base.json'), JSON.stringify({ items: ['Custom'] }));
  await expect(checkPrepared(root, definition)).rejects.toThrow();
  await prepareData(root, definition);
  expect(
    JSON.parse(await readFile(path.join(root, '.generated/content/base.json'), 'utf8'))
  ).toEqual({ items: ['Custom'] });
  expect(await readFile(path.join(root, '.generated/content/resources.json'), 'utf8')).not.toBe(
    original
  );
  const before = await readFile(path.join(root, '.generated/content/prepared.json'), 'utf8');
  await writeFile(path.join(root, '.local/base.json'), '{"items":false}');
  await expect(prepareData(root, definition)).rejects.toThrow();
  expect(await readFile(path.join(root, '.generated/content/prepared.json'), 'utf8')).toBe(before);
});

it('reserves internal artifact names instead of overwriting a namespace payload', () => {
  for (const name of ['prepared', 'manifest', 'resources'])
    expect(() =>
      jsonResourcesDefinition({
        version: 1,
        kind: 'content',
        resources: {
          [name]: {
            schema: z.object({}),
            schemaVersion: '1',
            defaults: 'default.json',
            custom: 'custom.json',
          },
        },
      })
    ).toThrow(/Reserved/);
});

it('isolates default validation from mutating conversion of an effective custom candidate', async () => {
  const defaults = { label: 'Ready', mode: 'default' };
  const sourceSchema = z.unknown().transform((value) => {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('label' in value) ||
      typeof value.label !== 'string'
    )
      throw new Error('Invalid fixture');
    value.label += '!';
    return value;
  });
  const schema = z.strictObject({ label: z.string(), mode: z.string() });
  const definition = jsonResourcesDefinition({
    version: 1,
    kind: 'content',
    resources: {
      entry: {
        schema,
        sourceSchema,
        schemaVersion: '1',
        defaults: 'default.json',
        custom: 'custom.json',
      },
    },
  });
  const output = await definition.resolve(
    (file) => Promise.resolve(file === 'default.json' ? defaults : { mode: 'custom' }),
    'custom'
  );
  const prepared = z.object({ values: z.object({ entry: schema }) }).parse(output);
  expect(prepared.values.entry).toEqual({ label: 'Ready!', mode: 'custom' });
  expect(defaults).toEqual({ label: 'Ready', mode: 'default' });
});

it('adds and removes JSON imports with the manifest and preserves the previous module on invalid input', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'json-imports-'));
  roots.push(root);
  await writeFile(path.join(root, 'base.json'), '{"title":"Base"}');
  await writeFile(path.join(root, 'extra.json'), '{"title":"Extra"}');
  const resource = (name: string) => ({
    schema: z.strictObject({ title: z.string() }),
    schemaVersion: '1',
    defaults: name + '.json',
    custom: '.local/' + name + '.json',
  });
  const base = jsonResourcesDefinition({
    version: 1,
    kind: 'content',
    resources: { base: resource('base') },
  });
  const expanded = jsonResourcesDefinition({
    version: 1,
    kind: 'content',
    resources: { base: resource('base'), extra: resource('extra') },
  });
  const file = path.join(root, '.generated/content/server-imports.ts');
  await prepareData(root, expanded, 'default');
  const module = await readFile(file, 'utf8');
  expect(module).toContain('import("./extra.json")');
  await writeFile(path.join(root, 'extra.json'), '{"title":false}');
  await expect(prepareData(root, expanded, 'default')).rejects.toThrow();
  expect(await readFile(file, 'utf8')).toBe(module);
  await prepareData(root, base, 'default');
  expect(await readFile(file, 'utf8')).not.toContain('extra.json');
  await expect(readFile(path.join(root, '.generated/content/extra.json'))).rejects.toThrow(
    /ENOENT/
  );
});
