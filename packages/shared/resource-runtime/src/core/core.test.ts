import { describe, expect, it, vi } from 'vitest';
import { createResourcePlan, planResources } from './plan.js';
import { loadResource, prepareResourcePlan, createResourceFetcher } from './load.js';
import {
  createResourceSnapshot,
  restoreResourceSnapshot,
  restoreResourceEntries,
} from './snapshot.js';
import { ResourceError, type ResourceDefinition, type ResourceReader } from './contracts.js';
import { createHttpResourceReader } from '../http.js';
const validateArtifact = (input: unknown): undefined => {
  if (typeof input !== 'string') throw new Error('Expected string');
};
const definition = (id = 'example', version = '1'): ResourceDefinition => ({
  id,
  version,
  schemaVersion: '1',
  source: 'public',
  url: `/resources/${version}/${id}.json`,
  validateArtifact,
});
const one = () => {
  const entry = createResourcePlan([definition()]).resources[0];
  if (!entry) throw new Error('Missing fixture');
  return entry;
};
describe('resource planning and snapshots', () => {
  it('resolves generic contexts, deduplicates and is independent of input ordering', () => {
    const registry = {
      fixed: () => definition('fixed'),
      localized: (locale: string) => definition(locale),
    };
    const first = planResources(registry, ['localized', 'fixed', 'fixed'], 'ja');
    const second = createResourcePlan([definition('fixed'), definition('ja')]);
    expect(first.key).toBe(second.key);
    expect(first.resources).toHaveLength(2);
    expect(() => planResources(registry, ['absent'], 'ja')).toThrow(ResourceError);
    expect(() => createResourcePlan([definition(), definition('example', '2')])).toThrow(
      ResourceError
    );
    expect(() => createResourcePlan([definition()], {}, 0)).toThrow(RangeError);
    expect(() => createResourcePlan([definition(), definition('extra')], {}, 1)).toThrow(
      ResourceError
    );
    expect(createResourcePlan([definition()], { b: 'b', a: 'a' }).key).toBe(
      createResourcePlan([definition()], { a: 'a', b: 'b' }).key
    );
  });
  it('uses locale-independent identity ordering on both sides of SSR', () => {
    const plan = createResourcePlan(
      ['ä', 'Z', 'a'].map((id) => definition(id)),
      {
        ä: 'last',
        Z: 'first',
        a: 'middle',
      }
    );
    expect(plan.resources.map((entry) => entry.id)).toEqual(['Z', 'a', 'ä']);
    expect(Object.keys(plan.context)).toEqual(['Z', 'a', 'ä']);
  });
  it('scales namespaces and locale by registration rather than core branches', () => {
    const resources = Array.from({ length: 300 }, (_, i) => definition(`resource-${i}`));
    expect(createResourcePlan(resources).resources).toHaveLength(300);
    const data: ResourceDefinition = {
      ...definition('configuration'),
      validateArtifact: (input) => {
        if (typeof input !== 'boolean') throw new Error('boolean');
      },
    };
    expect(
      restoreResourceSnapshot(createResourcePlan([data]), {
        version: 1,
        planKey: createResourcePlan([data]).key,
        resources: [{ key: createResourcePlan([data]).resources[0]?.key, value: true }],
      }).resources[0]?.value
    ).toBe(true);
  });
  it('rejects unknown, duplicate, invalid, versioned and cross-locale snapshots', async () => {
    const plan = createResourcePlan([definition()], { locale: 'en' });
    const snapshot = await prepareResourcePlan(plan, () => Promise.resolve('value'));
    expect(restoreResourceSnapshot(plan, snapshot).resources[0]?.value).toBe('value');
    for (const invalid of [
      { ...snapshot, version: 2 },
      { ...snapshot, resources: [] },
      { ...snapshot, resources: [...snapshot.resources, ...snapshot.resources] },
      { ...snapshot, extra: true },
      { ...snapshot, resources: [{ key: 'other', value: 'value' }] },
      { ...snapshot, resources: [{ key: plan.resources[0]?.key, value: 12 }] },
    ])
      expect(() => restoreResourceSnapshot(plan, invalid)).toThrow(ResourceError);
    expect(() =>
      restoreResourceSnapshot(createResourcePlan([definition()], { locale: 'zh' }), snapshot)
    ).toThrow(ResourceError);
    expect(() => createResourceSnapshot(plan, [{ key: one().key, value: undefined }])).toThrow(
      ResourceError
    );
  });
  it('converts at the reader once and preserves artifacts across serialized snapshots and partial seeds', async () => {
    const convert = vi.fn(Number);
    const plan = createResourcePlan([
      {
        ...definition(),
        validateArtifact(value) {
          if (typeof value !== 'number') throw new Error('Expected a prepared number');
        },
      },
    ]);
    const original = await prepareResourcePlan(plan, () => Promise.resolve(convert('42')));
    let snapshot = original;
    for (let count = 0; count < 2; count++) {
      const restored = restoreResourceSnapshot(
        plan,
        JSON.parse(JSON.stringify(snapshot)) as unknown
      );
      expect(restored.resources[0]?.value).toBe(42);
      snapshot = createResourceSnapshot(plan, restoreResourceEntries(plan, restored.resources));
      expect(snapshot).toEqual(original);
    }
    expect(convert).toHaveBeenCalledTimes(1);
    const tampered = snapshot.resources.map((entry) => ({ ...entry, value: '42' }));
    expect(() => restoreResourceSnapshot(plan, { ...snapshot, resources: tampered })).toThrow(
      ResourceError
    );
    expect(() => restoreResourceEntries(plan, tampered)).toThrow(ResourceError);
  });
  it('rejects returning a replacement value from untyped artifact validators', async () => {
    const plan = createResourcePlan([
      {
        ...definition(),
        // @ts-expect-error Exercise the contract for a plain JavaScript caller.
        validateArtifact: (value: unknown) => String(value) + '!',
      },
    ]);
    await expect(prepareResourcePlan(plan, () => Promise.resolve('Ready'))).rejects.toMatchObject({
      kind: 'invalid-data',
    });
  });
  it('owns and freezes prepared data without freezing caller objects', () => {
    const value = { enabled: true };
    const plan = createResourcePlan([{ ...definition(), validateArtifact: () => undefined }]);
    const snapshot = createResourceSnapshot(plan, [{ key: plan.resources[0]?.key ?? '', value }]);
    value.enabled = false;
    expect(snapshot.resources[0]?.value).toEqual({ enabled: true });
    expect(Object.isFrozen(snapshot.resources[0]?.value)).toBe(true);
  });
});
describe('readers and lifecycle', () => {
  it('bounds concurrency and releases the queue after errors', async () => {
    let active = 0,
      peak = 0;
    const reader: ResourceReader = async (resource) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active--;
      if (resource.id === 'bad') throw new Error('failed');
      return resource.id;
    };
    const fetchResource = createResourceFetcher(reader, { concurrency: 2 });
    const results = await Promise.allSettled(
      createResourcePlan([
        definition('bad'),
        definition('a'),
        definition('b'),
        definition('c'),
      ]).resources.map((entry) => fetchResource(entry))
    );
    expect(peak).toBe(2);
    expect(results.filter((entry) => entry.status === 'fulfilled')).toHaveLength(3);
  });
  it('has a complete deadline even when a reader ignores cancellation', async () => {
    vi.useFakeTimers();
    try {
      const pending = loadResource(one(), () => new Promise(() => {}), 20).catch(
        (error: unknown) => error
      );
      await vi.advanceTimersByTimeAsync(20);
      await expect(pending).resolves.toMatchObject({ kind: 'timeout' });
    } finally {
      vi.useRealTimers();
    }
  });
  it('cancels active and queued work without corrupting the semaphore', async () => {
    const controller = new AbortController();
    const fetchResource = createResourceFetcher(
      async (_entry, signal) => {
        await new Promise<void>((resolve) =>
          signal.addEventListener('abort', () => resolve(), { once: true })
        );
        return 'done';
      },
      { concurrency: 1 }
    );
    const running = fetchResource(one(), controller.signal).catch((e: unknown) => e);
    const queued = fetchResource(one(), controller.signal).catch((e: unknown) => e);
    controller.abort();
    expect(await running).toMatchObject({ kind: 'aborted' });
    expect(await queued).toMatchObject({ kind: 'aborted' });
  });
  it('distinguishes HTTP, JSON, data, size and stalled-body failures', async () => {
    const fake = (response: Response) =>
      createHttpResourceReader({
        fetch: vi.fn<typeof fetch>().mockResolvedValue(response),
        maxBytes: 8,
      });
    await expect(
      loadResource(one(), fake(new Response('', { status: 503 })))
    ).rejects.toMatchObject({ kind: 'http' });
    await expect(loadResource(one(), fake(new Response('{')))).rejects.toMatchObject({
      kind: 'invalid-json',
    });
    await expect(loadResource(one(), fake(new Response('123')))).rejects.toMatchObject({
      kind: 'invalid-data',
    });
    await expect(loadResource(one(), fake(new Response('0123456789')))).rejects.toMatchObject({
      kind: 'too-large',
    });
    await expect(
      loadResource(one(), fake(new Response(new ReadableStream({ start() {} }))), 15)
    ).rejects.toMatchObject({ kind: 'timeout' });
    await expect(
      loadResource(
        one(),
        createHttpResourceReader({
          fetch: vi.fn<typeof fetch>().mockRejectedValue(new TypeError('network')),
        })
      )
    ).rejects.toMatchObject({ kind: 'network' });
  });
});

it('bounds queued work, deduplicates active identities and permits a new attempt after completion', async () => {
  let release: (value: string) => void = () => {};
  const gate = new Promise<string>((resolve) => {
    release = resolve;
  });
  const reader = vi.fn<ResourceReader>(() => gate);
  const fetchResource = createResourceFetcher(reader, { concurrency: 1, maxPendingResources: 1 });
  const entries = createResourcePlan([
    definition('first'),
    definition('second'),
    definition('third'),
  ]).resources;
  const [first, second, third] = entries;
  if (!first || !second || !third) throw new Error('Missing fixtures');
  const running = fetchResource(first);
  const duplicate = fetchResource(first);
  expect(duplicate).toBe(running);
  const queued = fetchResource(second);
  await expect(fetchResource(third)).rejects.toMatchObject({ kind: 'capacity' });
  release('ready');
  await Promise.all([running, queued]);
  await fetchResource(first);
  expect(reader).toHaveBeenCalledTimes(3);
  fetchResource.dispose();
  await expect(fetchResource(first)).rejects.toMatchObject({ kind: 'aborted' });
});

it('restores validated partial entries without allowing incomplete full snapshots', async () => {
  const plan = createResourcePlan([definition('common'), definition('page')]);
  const snapshot = await prepareResourcePlan(plan, () => Promise.resolve('ready'));
  const partial = snapshot.resources.slice(0, 1);
  expect(restoreResourceEntries(plan, partial)).toEqual(partial);
  expect(() => restoreResourceSnapshot(plan, { ...snapshot, resources: partial })).toThrow(
    ResourceError
  );
  for (const input of [
    null,
    [...partial, ...partial],
    [{ key: 'foreign', value: 'ready' }],
    partial.map((entry) => ({ ...entry, value: 1 })),
    partial.map((entry) => ({ ...entry, extra: true })),
  ])
    expect(() => restoreResourceEntries(plan, input)).toThrow(ResourceError);
  const foreign = await prepareResourcePlan(createResourcePlan([definition('common', '2')]), () =>
    Promise.resolve('ready')
  );
  expect(() => restoreResourceEntries(plan, foreign.resources)).toThrow(ResourceError);
});
