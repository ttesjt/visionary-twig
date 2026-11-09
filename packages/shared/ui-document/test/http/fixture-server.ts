import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createMemoryContentStore } from '@frontend/ui-document/memory';
import type { ContentVersion } from '@frontend/ui-document';
import { fixture, registry } from '../fixtures.js';

export interface RecordedRequest {
  readonly path: string;
  readonly method: string | undefined;
  readonly authorization: string | undefined;
  readonly body: string;
}

export async function startFixtureServer() {
  const store = createMemoryContentStore({ registry });
  await store.save('initial', fixture());
  const requests: RecordedRequest[] = [];
  const waiting = new Map<string, (() => void)[]>();
  const server = createServer((request, response) => {
    void handle(request, response).catch(() => {
      response.writeHead(500);
      response.end();
    });
  });

  function versionHeaders(response: ServerResponse, version: ContentVersion): void {
    response.setHeader('x-content-revision', version.revision);
    if (version.etag !== undefined) response.setHeader('etag', version.etag);
  }

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const path = new URL(request.url ?? '/', 'http://fixture.test').pathname;
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      const value: unknown = chunk;
      if (!Buffer.isBuffer(value)) throw new Error('Expected bytes.');
      chunks.push(value);
    }
    const body = Buffer.concat(chunks).toString('utf8');
    requests.push({
      path,
      method: request.method,
      authorization: request.headers.authorization,
      body,
    });
    for (const resolve of waiting.get(path) ?? []) resolve();
    waiting.delete(path);
    response.setHeader('content-type', 'application/json');
    response.setHeader('x-content-revision', '1');
    if (path === '/slow-headers') return;
    if (path === '/slow-body') {
      response.writeHead(200);
      response.write('{');
      return;
    }
    if (path === '/redirect') {
      response.writeHead(302, { location: '/capture' });
      response.end();
      return;
    }
    if (path === '/error') {
      response.writeHead(503);
      response.end('private server detail');
      return;
    }
    if (path === '/malformed') {
      response.end('{');
      return;
    }
    if (path === '/html') {
      response.setHeader('content-type', 'text/html');
      response.end('<p>Error</p>');
      return;
    }
    if (path === '/bad-version') {
      response.setHeader('x-content-revision', 'invalid');
      response.end('{}');
      return;
    }
    if (path === '/no-version') {
      response.removeHeader('x-content-revision');
      response.end('{}');
      return;
    }
    if (path === '/mismatched-version') {
      response.end(JSON.stringify({ ...fixture(), revision: 2 }));
      return;
    }
    if (path === '/large') {
      response.end(JSON.stringify({ body: 'x'.repeat(4096) }));
      return;
    }
    if (path === '/stream-large') {
      response.write('[');
      for (let i = 0; i < 5; i++) response.write(`"${'x'.repeat(200)}",`);
      response.end('null]');
      return;
    }
    if (path === '/invalid-utf8') {
      response.end(Buffer.from([0xff, 0xfe]));
      return;
    }
    if (path === '/capture') {
      response.end('{}');
      return;
    }
    if (path === '/conflict') {
      response.writeHead(409);
      response.end();
      return;
    }
    if (path === '/conflict-no-version') {
      response.removeHeader('x-content-revision');
      response.writeHead(412);
      response.end();
      return;
    }
    if (!path.startsWith('/documents/')) {
      response.writeHead(404);
      response.end();
      return;
    }
    const key = decodeURIComponent(path.slice('/documents/'.length));
    if (request.method === 'GET') {
      const result = await store.read(key);
      if (result.status === 'found') {
        versionHeaders(response, result.version);
        response.end(result.rawJson);
      } else {
        response.writeHead(404);
        response.end();
      }
      return;
    }
    const rawRevision = request.headers['x-expected-revision'];
    const etag = request.headers['if-match'];
    const result = await store.save(key, body, {
      ...(typeof rawRevision === 'string' ? { expectedRevision: Number(rawRevision) } : {}),
      ...(typeof etag === 'string' ? { expectedEtag: etag } : {}),
    });
    if (result.status === 'saved') {
      versionHeaders(response, result.version);
      response.writeHead(204);
      response.end();
    } else if (result.status === 'conflict') {
      if (result.currentVersion) versionHeaders(response, result.currentVersion);
      response.writeHead(412);
      response.end();
    } else {
      response.writeHead(422);
      response.end();
    }
  }

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Expected TCP address.');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    requests,
    waitForRequest(path: string): Promise<void> {
      if (requests.some((request) => request.path === path)) return Promise.resolve();
      return new Promise((resolve) => waiting.set(path, [...(waiting.get(path) ?? []), resolve]));
    },
    async close(): Promise<void> {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    },
  };
}
