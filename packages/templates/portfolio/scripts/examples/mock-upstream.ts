import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

export type MockScenario = 'ok' | 'rejected' | 'invalid' | 'oversized' | 'stalled' | 'redirect';
export const DEMO_UPSTREAM_KEY = 'demo-only-key';
const DEMO_UPSTREAM_PORT = 3215;

/** Loopback development fixture, also used by production-browser tests. */
export async function startMockUpstream({
  key = DEMO_UPSTREAM_KEY,
  port = 0,
  scenario = () => 'ok',
}: {
  key?: string;
  port?: number;
  scenario?: () => MockScenario;
} = {}) {
  const requests: { authorized: boolean; topic: string }[] = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const topic = url.searchParams.get('topic') ?? '';
    const authorized = request.headers.authorization === 'Bearer ' + key;
    requests.push({ authorized, topic });
    response.setHeader('Content-Type', 'application/json');
    if (request.method !== 'GET' || url.pathname !== '/recommendation') {
      response.writeHead(404).end();
      return;
    }
    if (!authorized || scenario() === 'rejected') {
      response.writeHead(401).end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }
    switch (scenario()) {
      case 'redirect':
        response.writeHead(302, { Location: '/redirected' }).end();
        break;
      case 'stalled':
        response.writeHead(200);
        response.write('{"recommendation":');
        break;
      case 'invalid':
        response.end('{"private":"unrelated response"}');
        break;
      case 'oversized':
        response.end(JSON.stringify({ recommendation: 'x'.repeat(4096) }));
        break;
      default:
        response.end(
          JSON.stringify({
            recommendation: 'Start a small study about ' + topic + '.',
            provider: 'local-demo',
          })
        );
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Mock upstream did not bind.');
  return {
    url: 'http://127.0.0.1:' + address.port + '/recommendation',
    requests,
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.MOCK_UPSTREAM_PORT ?? DEMO_UPSTREAM_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Invalid MOCK_UPSTREAM_PORT.');
  const mock = await startMockUpstream({
    port,
    key: process.env.MOCK_UPSTREAM_API_KEY ?? DEMO_UPSTREAM_KEY,
  });
  console.log('Local example upstream listening at ' + mock.url);
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.once(signal, () => {
      void mock.close();
    });
}
