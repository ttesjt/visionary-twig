import { createServer } from 'node:net';

export const MAX_DEV_PORT_RETRIES = 10;

/** A probe is advisory; the launcher also handles a competing bind after it closes. */
export function portAvailable(host, port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') resolve(false);
      else reject(error);
    });
    server.listen({ host, port, exclusive: true }, () => {
      server.close((error) => (error ? reject(error) : resolve(true)));
    });
  });
}
