import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveDocument } from '@frontend/ui-document';
import { createHttpContentSink, createHttpContentSource } from '@frontend/ui-document/http';
import { fixture, registry } from '../fixtures.js';
import { unwrap } from '../helpers.js';
import { startFixtureServer } from './fixture-server.js';

describe('explicit HTTP content adapters with real HTTP', () => {
  let server: Awaited<ReturnType<typeof startFixtureServer>>;
  beforeEach(async () => {
    server = await startFixtureServer();
  });
  afterEach(async () => {
    if (server) await server.close();
  });
  const versionHeaders = { revision: 'x-content-revision', etag: 'etag' };

  function source(path?: string, timeoutMs = 1000, maxResponseBytes?: number) {
    return createHttpContentSource({
      origin: server.origin,
      versionHeaders,
      timeoutMs,
      ...(maxResponseBytes === undefined ? {} : { maxResponseBytes }),
      endpoint: {
        method: 'GET',
        urlForKey: (key) => path ?? `/documents/${encodeURIComponent(key)}`,
        headers: { authorization: 'Bearer fixture-token' },
        cache: 'no-store',
        credentials: 'omit',
      },
    });
  }
  function sink(path?: string) {
    return createHttpContentSink({
      origin: server.origin,
      versionHeaders,
      registry,
      endpoint: {
        method: 'PUT',
        urlForKey: (key) => path ?? `/documents/${encodeURIComponent(key)}`,
        headers: { authorization: 'Bearer fixture-token' },
        preconditionHeaders: { revision: 'x-expected-revision', etag: 'if-match' },
      },
    });
  }

  it('reads, validates, writes and rereads raw bindings with version preconditions', async () => {
    const initial = await source().read('initial');
    if (initial.status !== 'found') throw new Error('Expected initial content.');
    const resolved = unwrap(resolveDocument(initial.rawJson, registry));
    expect(resolved.metadata.revision).toBe(initial.version.revision);
    expect(JSON.stringify(resolved.data)).toContain('Sample article');
    const key = 'space / 汉';
    const saved = await sink().save(key, fixture(), { expectedRevision: 0 });
    expect(saved).toMatchObject({ status: 'saved', version: { revision: 1 } });
    const read = await source().read(key);
    if (read.status !== 'found') throw new Error('Expected reread content.');
    if (read.version.etag === undefined) throw new Error('Expected HTTP etag.');
    expect(unwrap(resolveDocument(read.rawJson, registry)).document.bindings).toEqual(
      fixture().bindings
    );
    expect(read.rawJson).toContain('"text":""');
    expect(
      await sink().save(key, fixture(), { expectedRevision: 1, expectedEtag: read.version.etag })
    ).toMatchObject({ status: 'saved', version: { revision: 2 } });
    expect(await sink().save(key, fixture(), { expectedRevision: 1 })).toMatchObject({
      status: 'conflict',
      currentVersion: { revision: 2 },
    });
    expect(
      server.requests.every((request) => request.authorization === 'Bearer fixture-token')
    ).toBe(true);
  });

  it('returns not-found, explicit unconfigured status and invalid saves without a request', async () => {
    expect(await source().read('absent')).toEqual({ status: 'not-found' });
    const before = server.requests.length;
    expect(await sink().save('key', { ...fixture(), bindings: [] })).toMatchObject({
      status: 'invalid',
    });
    expect(server.requests).toHaveLength(before);
    expect(
      await createHttpContentSource({ origin: server.origin, versionHeaders }).read('key')
    ).toMatchObject({ status: 'unavailable', reason: 'unconfigured' });
    expect(
      await createHttpContentSink({ origin: server.origin, versionHeaders, registry }).save(
        'key',
        fixture()
      )
    ).toMatchObject({ status: 'unavailable', reason: 'unconfigured' });
  });

  it('observes a new content/variables revision from the same running source', async () => {
    const adapter = source();
    const first = await adapter.read('initial');
    if (first.status !== 'found') throw new Error('Expected initial snapshot.');
    const updated = { ...fixture(), variables: { content: { title: 'Updated at runtime' } } };
    expect(await sink().save('initial', updated, { expectedRevision: 1 })).toMatchObject({
      status: 'saved',
      version: { revision: 2 },
    });
    const second = await adapter.read('initial');
    if (second.status !== 'found') throw new Error('Expected updated snapshot.');
    const resolved = unwrap(resolveDocument(second.rawJson, registry));
    expect(second.version.revision).toBe(2);
    expect(resolved.metadata.revision).toBe(2);
    expect(JSON.stringify(resolved.data)).toContain('Updated at runtime');
    expect(unwrap(resolveDocument(first.rawJson, registry)).metadata.revision).toBe(1);
  });

  it('sends no credentials unless the endpoint explicitly configures them', async () => {
    const publicSource = createHttpContentSource({
      origin: server.origin,
      versionHeaders,
      endpoint: { method: 'GET', urlForKey: () => '/documents/initial' },
    });
    expect(await publicSource.read('initial')).toMatchObject({ status: 'found' });
    expect(server.requests[0]?.authorization).toBeUndefined();
    expect(await source().read('initial')).toMatchObject({ status: 'found' });
    expect(server.requests[1]?.authorization).toBe('Bearer fixture-token');
  });

  it('rejects duplicate condition/version header names and invalid timer configuration', () => {
    expect(() =>
      createHttpContentSource({
        origin: server.origin,
        versionHeaders: { revision: 'Version', etag: 'version' },
      })
    ).toThrow(TypeError);
    expect(() =>
      createHttpContentSource({ origin: server.origin, versionHeaders, timeoutMs: 2_147_483_648 })
    ).toThrow(RangeError);
    expect(() =>
      createHttpContentSink({
        origin: server.origin,
        versionHeaders,
        registry,
        endpoint: {
          method: 'PUT',
          urlForKey: () => '/documents/key',
          preconditionHeaders: { revision: 'If-Match', etag: 'if-match' },
        },
      })
    ).toThrow(TypeError);
  });

  it.each([
    '/malformed',
    '/html',
    '/bad-version',
    '/no-version',
    '/invalid-utf8',
    '/mismatched-version',
  ])('rejects invalid response %s', async (path) => {
    expect(await source(path).read('key')).toMatchObject({
      status: 'unavailable',
      reason: 'invalid-response',
    });
  });

  it('reports HTTP failures and both conflict statuses without leaking response bodies', async () => {
    expect(await source('/error').read('key')).toEqual({
      status: 'unavailable',
      reason: 'http',
      httpStatus: 503,
      message: 'Content read failed.',
    });
    expect(await sink('/error').save('key', fixture())).toMatchObject({
      status: 'unavailable',
      reason: 'http',
      httpStatus: 503,
    });
    expect(await sink('/conflict').save('key', fixture())).toMatchObject({
      status: 'conflict',
      currentVersion: { revision: 1 },
    });
    expect(await sink('/conflict-no-version').save('key', fixture())).toEqual({
      status: 'conflict',
    });
    expect(await sink('/no-version').save('key', fixture())).toMatchObject({
      status: 'unavailable',
      reason: 'invalid-response',
    });
  });

  it.each(['/slow-headers', '/slow-body'])(
    'times out across the whole response lifecycle: %s',
    async (path) => {
      expect(await source(path, 30).read('key')).toMatchObject({
        status: 'unavailable',
        reason: 'timeout',
      });
    }
  );

  it('cancels reads and writes and accepts pre-cancelled signals without sending', async () => {
    const controller = new AbortController();
    const pending = source('/slow-headers').read('key', { signal: controller.signal });
    await server.waitForRequest('/slow-headers');
    controller.abort();
    expect(await pending).toEqual({ status: 'cancelled' });
    const saveController = new AbortController();
    const save = sink('/slow-body').save('key', fixture(), { signal: saveController.signal });
    await server.waitForRequest('/slow-body');
    saveController.abort();
    expect(await save).toEqual({ status: 'cancelled' });
    const before = server.requests.length;
    expect(await source().read('key', { signal: AbortSignal.abort() })).toEqual({
      status: 'cancelled',
    });
    expect(await sink().save('key', fixture(), { signal: AbortSignal.abort() })).toEqual({
      status: 'cancelled',
    });
    expect(server.requests).toHaveLength(before);
  });

  it.each(['/large', '/stream-large'])(
    'bounds response bytes with and without Content-Length: %s',
    async (path) => {
      expect(await source(path, 1000, 128).read('key')).toMatchObject({
        status: 'unavailable',
        reason: 'response-too-large',
      });
    }
  );

  it('refuses off-origin endpoints, URL credentials and automatic redirects', async () => {
    const before = server.requests.length;
    for (const path of [
      'https://untrusted.invalid/document',
      `${server.origin.replace('://', '://user:password@')}/documents/initial`,
      '/documents/initial#secret',
    ])
      expect(await source(path).read('key')).toMatchObject({
        status: 'unavailable',
        reason: 'unsafe-endpoint',
      });
    expect(server.requests).toHaveLength(before);
    expect(await source('/redirect').read('key')).toMatchObject({
      status: 'unavailable',
      reason: 'network',
    });
    expect(server.requests.some((request) => request.path === '/capture')).toBe(false);
  });

  it('does not silently discard unmapped save preconditions', async () => {
    const unmapped = createHttpContentSink({
      origin: server.origin,
      versionHeaders,
      registry,
      endpoint: { method: 'PUT', urlForKey: () => '/documents/key' },
    });
    expect(await unmapped.save('key', fixture(), { expectedRevision: 0 })).toMatchObject({
      status: 'unavailable',
      reason: 'unconfigured',
    });
    expect(server.requests).toHaveLength(0);
  });

  it('enforces deadlines even for an injected fetch that ignores abort', async () => {
    const hangingFetch: typeof fetch = () => new Promise(() => {});
    const adapter = createHttpContentSource({
      origin: server.origin,
      versionHeaders,
      timeoutMs: 10,
      fetch: hangingFetch,
      endpoint: { method: 'GET', urlForKey: () => '/never' },
    });
    expect(await adapter.read('key')).toMatchObject({ status: 'unavailable', reason: 'timeout' });
  });

  it('times out an interrupted write and redacts underlying network errors', async () => {
    const write = createHttpContentSink({
      origin: server.origin,
      versionHeaders,
      registry,
      timeoutMs: 20,
      endpoint: { method: 'PUT', urlForKey: () => '/slow-headers' },
    });
    expect(await write.save('key', fixture())).toMatchObject({
      status: 'unavailable',
      reason: 'timeout',
    });
    const failingFetch: typeof fetch = () =>
      Promise.reject(new Error('private token and server address'));
    const read = createHttpContentSource({
      origin: server.origin,
      versionHeaders,
      fetch: failingFetch,
      endpoint: { method: 'GET', urlForKey: () => '/documents/initial' },
    });
    expect(await read.read('key')).toEqual({
      status: 'unavailable',
      reason: 'network',
      message: 'Content request failed.',
    });
  });
});
