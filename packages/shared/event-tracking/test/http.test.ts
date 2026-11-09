import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, expect, it } from 'vitest';
import { EventTracker } from '../src/index.js';

const servers: ReturnType<typeof createServer>[] = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.closeAllConnections();
          server.close((error) => (error ? reject(error) : resolve()));
        })
    )
  );
});
it.each([202, 204, 503])(
  'default fetch posts the exact JSON protocol and handles %s without a response document',
  async (status) => {
    let received: unknown;
    let contentType: string | undefined;
    const server = createServer((request, response) => {
      let text = '';
      request.setEncoding('utf8');
      request.on('data', (chunk: unknown) => {
        if (typeof chunk === 'string') text += chunk;
      });
      request.on('end', () => {
        received = JSON.parse(text);
        contentType = request.headers['content-type'];
        response.writeHead(status).end();
      });
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    const tracker = new EventTracker({
      projects: { sample: { url: 'http://127.0.0.1:' + address.port } },
    });
    const result = await tracker.track('sample', 'opened', {
      itemId: 'neutral',
      nested: [true, null],
    });
    expect(received).toEqual({
      projectId: 'sample',
      event: 'opened',
      data: { itemId: 'neutral', nested: [true, null] },
    });
    expect(contentType).toBe('application/json');
    expect(result).toEqual(
      status === 503
        ? { status: 'failed', reason: 'http-error', httpStatus: status }
        : { status: 'accepted', httpStatus: status }
    );
  }
);
it('aborts a real fetch that never receives headers', async () => {
  const server = createServer(() => {});
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const tracker = new EventTracker({
    projects: { sample: { url: 'http://127.0.0.1:' + (server.address() as AddressInfo).port } },
    timeoutMs: 30,
  });
  expect(await tracker.track('sample', 'opened', {})).toEqual({
    status: 'failed',
    reason: 'timeout',
  });
});
