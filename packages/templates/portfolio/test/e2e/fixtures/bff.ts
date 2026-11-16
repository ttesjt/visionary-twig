import { test as base } from '@playwright/test';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { startMockUpstream, type MockScenario } from '../../../scripts/examples/mock-upstream';

export const appDirectory = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(import.meta.url);
const STARTUP_TIMEOUT_MS = 20_000;

export async function startProductionServer(environment: NodeJS.ProcessEnv) {
  const child = spawn(
    process.execPath,
    [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '0'],
    {
      cwd: appDirectory,
      env: { ...process.env, ...environment, NEXT_TELEMETRY_DISABLED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  const errors: string[] = [];
  child.stderr.on('data', (data: Buffer) => errors.push(data.toString()));
  let endpoint = '';
  let failure: Error | undefined;
  child.on('error', (error) => {
    failure = error;
  });
  child.stdout.on('data', (data: Buffer) => {
    endpoint ||= data.toString().match(/http:\/\/127\.0\.0\.1:\d+/)?.[0] ?? '';
  });
  const close = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
    child.kill('SIGTERM');
    const forced = setTimeout(() => child.kill('SIGKILL'), 5_000);
    try {
      await exited;
    } finally {
      clearTimeout(forced);
    }
  };
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  try {
    while (Date.now() < deadline) {
      if (failure || child.exitCode !== null || child.signalCode !== null)
        throw new Error('Test Next server exited before readiness.', { cause: failure });
      if (endpoint) {
        try {
          const response = await fetch(endpoint, { signal: AbortSignal.timeout(1_000) });
          void response.body?.cancel().catch(() => {});
          if (response.ok) return { baseURL: endpoint, close, errors };
        } catch {
          /* Wait for the CLI's announced server to become ready. */
        }
      }
      await delay(50);
    }
    throw new Error('Test Next server did not become ready.');
  } catch (error) {
    await close();
    throw error;
  }
}

async function createBackend() {
  const secret = 'runtime-secret-' + randomUUID();
  let scenario: MockScenario = 'ok';
  const mock = await startMockUpstream({ key: secret, scenario: () => scenario });
  try {
    const server = await startProductionServer({
      EXAMPLE_UPSTREAM_URL: mock.url,
      EXAMPLE_UPSTREAM_API_KEY: secret,
    });
    return {
      ...server,
      secret,
      requests: mock.requests,
      setScenario(value: MockScenario) {
        scenario = value;
      },
      async close() {
        try {
          await server.close();
        } finally {
          await mock.close();
        }
      },
    };
  } catch (error) {
    await mock.close();
    throw error;
  }
}

export const test = base.extend<
  Record<never, never>,
  { backend: Awaited<ReturnType<typeof createBackend>> }
>({
  backend: [
    async ({ browserName }, run) => {
      void browserName;
      const backend = await createBackend();
      try {
        await run(backend);
      } finally {
        await backend.close();
      }
    },
    { scope: 'worker' },
  ],
});
export { expect } from '@playwright/test';
