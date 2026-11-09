import { afterAll, beforeAll, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { StorageConnection } from '@frontend/storage';
import { openLocalCloudflareStorage } from './local.js';
let directory: string;
let storage: StorageConnection;
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'cloudflare-adapter-'));
  const config = path.join(directory, 'wrangler.json');
  await writeFile(
    config,
    JSON.stringify({
      name: 'adapter-test',
      compatibility_date: '2026-10-20',
      d1_databases: [
        {
          binding: 'DB',
          database_name: 'adapter-test',
          database_id: '00000000-0000-4000-8000-000000000000',
          remote: false,
        },
      ],
      r2_buckets: [{ binding: 'MEDIA', bucket_name: 'adapter-test', remote: false }],
    })
  );
  storage = await openLocalCloudflareStorage(config, { remoteBindings: false });
  await storage.database.batch([{ sql: 'CREATE TABLE example (id TEXT PRIMARY KEY)' }]);
}, 30000);
afterAll(async () => {
  await storage?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});
it('adapts D1 atomic batches and bound values to neutral SQL ports', async () => {
  await expect(
    storage.database.batch([
      { sql: 'INSERT INTO example VALUES (?)', values: ['same'] },
      { sql: 'INSERT INTO example VALUES (?)', values: ['same'] },
    ])
  ).rejects.toThrow();
  expect(await storage.database.all('SELECT * FROM example')).toEqual([]);
});
it('adapts R2 bytes and metadata while validating keys', async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  await storage.objects.put('example.bin', { bytes, contentType: 'application/octet-stream' });
  expect(await storage.objects.get('example.bin')).toEqual({
    bytes,
    contentType: 'application/octet-stream',
  });
  await expect(storage.objects.get('../invalid')).rejects.toThrow();
});
