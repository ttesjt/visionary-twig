import { describe, expect, it } from 'vitest';
import { resolveDocument } from '@frontend/ui-document';
import { createMemoryContentStore } from '@frontend/ui-document/memory';
import { fixture, registry } from './fixtures.js';
import { unwrap } from './helpers.js';

describe('process-local content Source/Sink', () => {
  it('saves raw bindings, reads snapshots and lets the store assign revisions', async () => {
    const store = createMemoryContentStore({ registry });
    expect(await store.read('route-key')).toEqual({ status: 'not-found' });
    const input = { ...fixture(), revision: 90 };
    expect(await store.save('route-key', input, { expectedRevision: 0 })).toMatchObject({
      status: 'saved',
      version: { revision: 1 },
    });
    const first = await store.read('route-key');
    expect(first.status).toBe('found');
    if (first.status !== 'found') throw new Error('Expected saved snapshot.');
    if (first.version.etag === undefined) throw new Error('Expected memory etag.');
    const document = unwrap(resolveDocument(first.rawJson, registry)).document;
    expect(document.revision).toBe(1);
    expect(document.documentId).toBe('sample-article');
    expect(document.bindings).toEqual(input.bindings);
    expect(JSON.stringify(document.data)).toContain('"text":""');
    expect(
      await store.save('route-key', document, {
        expectedRevision: 1,
        expectedEtag: first.version.etag,
      })
    ).toMatchObject({ status: 'saved', version: { revision: 2 } });
    expect(input.revision).toBe(90);
    expect(await createMemoryContentStore({ registry }).read('route-key')).toEqual({
      status: 'not-found',
    });
  });

  it('returns independent versions and has no aliases to caller input', async () => {
    const store = createMemoryContentStore({ registry });
    const input = fixture();
    const saved = await store.save('key', input);
    if (saved.status !== 'saved') throw new Error('Expected saved.');
    Object.defineProperty(saved.version, 'revision', { value: 999 });
    Object.defineProperty(input, 'revision', { value: 88 });
    const read = await store.read('key');
    if (read.status !== 'found') throw new Error('Expected found.');
    expect(read.version.revision).toBe(1);
    expect(unwrap(resolveDocument(read.rawJson, registry)).document.revision).toBe(1);
    Object.defineProperty(read.version, 'revision', { value: 123 });
    expect(await store.read('key')).toMatchObject({ version: { revision: 1 } });
  });

  it('atomically rejects stale revision and etag writes', async () => {
    const store = createMemoryContentStore({ registry });
    await store.save('key', fixture());
    const results = await Promise.all(
      Array.from({ length: 10 }, () => store.save('key', fixture(), { expectedRevision: 1 }))
    );
    expect(results.filter((result) => result.status === 'saved')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'conflict')).toHaveLength(9);
    expect(await store.save('key', fixture(), { expectedEtag: '"stale"' })).toMatchObject({
      status: 'conflict',
      currentVersion: { revision: 2 },
    });
    expect(await store.save('missing', fixture(), { expectedRevision: 1 })).toEqual({
      status: 'conflict',
    });
  });

  it('refuses invalid content and pre-cancelled operations without changing storage', async () => {
    const store = createMemoryContentStore({ registry });
    expect(await store.save('key', { ...fixture(), bindings: [] })).toMatchObject({
      status: 'invalid',
      errors: [{ code: 'invalid-props' }],
    });
    expect(await store.read('key')).toEqual({ status: 'not-found' });
    const signal = AbortSignal.abort();
    expect(await store.save('key', fixture(), { signal })).toEqual({ status: 'cancelled' });
    expect(await store.read('key', { signal })).toEqual({ status: 'cancelled' });
    expect(await store.read('key')).toEqual({ status: 'not-found' });
  });

  it('validates external context without embedding it into stored variables', async () => {
    const store = createMemoryContentStore({ registry });
    const input = {
      ...fixture(),
      bindings: [{ nodeId: 'title', targetPath: ['text'], sourcePath: ['request', 'title'] }],
    };
    expect(await store.save('key', input)).toMatchObject({ status: 'invalid' });
    expect(
      await store.save('key', input, { context: { request: { title: 'From a snapshot' } } })
    ).toMatchObject({ status: 'saved' });
    const read = await store.read('key');
    if (read.status !== 'found') throw new Error('Expected found.');
    expect(read.rawJson).not.toContain('From a snapshot');
    expect(
      unwrap(
        resolveDocument(read.rawJson, registry, {
          context: { request: { title: 'From a snapshot' } },
        })
      ).metadata.revision
    ).toBe(1);
  });
});
