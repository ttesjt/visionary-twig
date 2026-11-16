// @vitest-environment node
import { it, expect, vi } from 'vitest';
import { z } from 'zod';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { prepareData } from '@frontend/prepared-data/node';
import { jsonResourcesDefinition } from '@frontend/prepared-data/resource/node';
import {
  JsonResource,
  validateJsonArtifact,
  type JsonResourceInput,
} from '@frontend/prepared-data/resource';
import {
  createResourcePlan,
  prepareResourcePlan,
  restoreResourceSnapshot,
  createResourceSnapshot,
} from '@frontend/resource-runtime';
import { createHttpResourceReader } from '@frontend/resource-runtime/http';

it('converts raw sources once and preserves prepared values through SSR, HTTP and repeated snapshot restoration', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'converted-resource-'));
  const number = vi.fn((value: string) => Number(value));
  const append = vi.fn((value: string) => value + '!');
  const schemas = { count: z.number(), label: z.string() };
  try {
    await mkdir(path.join(root, 'data'));
    await writeFile(path.join(root, 'data/count.json'), '"42"');
    await writeFile(path.join(root, 'data/label.json'), '"Ready"');
    const definition = jsonResourcesDefinition({
      version: 1,
      kind: 'content',
      resources: {
        count: {
          schema: schemas.count,
          sourceSchema: z.string().transform(number),
          schemaVersion: '1',
          defaults: 'data/count.json',
          custom: '.local/count.json',
        },
        label: {
          schema: schemas.label,
          sourceSchema: z.string().transform(append),
          schemaVersion: '1',
          defaults: 'data/label.json',
          custom: '.local/label.json',
        },
      },
    });
    await prepareData(root, definition, 'default');
    const values: Record<string, unknown> = {};
    for (const name of Object.keys(schemas))
      values[name] = JSON.parse(
        await readFile(path.join(root, '.generated/content', name + '.json'), 'utf8')
      ) as unknown;
    expect(values).toEqual({ count: 42, label: 'Ready!' });
    expect(number).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledTimes(1);
    const plan = createResourcePlan(
      Object.entries(schemas).map(([id, schema]) => ({
        id,
        url: '/content/' + id + '.json',
        source: 'content',
        version: '1',
        schemaVersion: '1',
        validateArtifact(input: unknown): undefined {
          validateJsonArtifact(schema, input);
        },
      }))
    );
    const server = await prepareResourcePlan(plan, (entry) => Promise.resolve(values[entry.id]));
    const transport = vi.fn<typeof fetch>((request) => {
      const url =
        typeof request === 'string' ? request : request instanceof URL ? request.href : request.url;
      const id = url.split('/').at(-1)?.replace('.json', '');
      return Promise.resolve(Response.json(id ? values[id] : null));
    });
    const browser = await prepareResourcePlan(plan, createHttpResourceReader({ fetch: transport }));
    expect(browser).toEqual(server);
    for (let index = 0, snapshot = server; index < 4; index++) {
      const restored = restoreResourceSnapshot(
        plan,
        JSON.parse(JSON.stringify(snapshot)) as unknown
      );
      const inputs = restored.resources.map<JsonResourceInput<typeof schemas>>((entry) => {
        const name = plan.resources.find((resource) => resource.key === entry.key)?.id;
        if (name !== 'count' && name !== 'label') throw new Error('Unknown test resource');
        return { namespace: name, version: '1', value: entry.value };
      });
      const reader = new JsonResource(schemas, inputs).createView();
      expect(reader.get('count')).toBe(42);
      expect(reader.get('label')).toBe('Ready!');
      snapshot = createResourceSnapshot(plan, restored.resources);
    }
    expect(number).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledTimes(1);
    const invalid = {
      ...server,
      resources: server.resources.map((entry) => ({ ...entry, value: 'invalid' })),
    };
    expect(() => restoreResourceSnapshot(plan, invalid)).toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
