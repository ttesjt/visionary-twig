import { expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openNodeStorage } from './connection.js';
it('injects local SQL/files ports and owns connection release without creating schema', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'node-storage-'));
  const filename = path.join(directory, 'data.sqlite');
  const initial = new DatabaseSync(filename);
  initial.exec('CREATE TABLE example(id TEXT PRIMARY KEY)');
  initial.close();
  const storage = openNodeStorage({ filename, mediaDirectory: path.join(directory, 'media') });
  try {
    await storage.database.batch([{ sql: 'INSERT INTO example VALUES (?)', values: ['local'] }]);
    expect(await storage.read((database) => database.all('SELECT * FROM example'))).toEqual([
      { id: 'local' },
    ]);
    const object = { bytes: new Uint8Array([1, 2, 3]), contentType: 'image/png' };
    await storage.objects.put('sample.png', object);
    expect(await storage.objects.get('sample.png')).toEqual(object);
    await expect(storage.objects.get('../invalid')).rejects.toThrow();
  } finally {
    await storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});
