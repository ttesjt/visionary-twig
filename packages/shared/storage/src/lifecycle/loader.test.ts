import { expect, it, vi } from 'vitest';
import { createStorageLoader } from './loader.js';
import type { StorageConnection } from './contracts.js';
it('injects providers, retries failed initialization and releases changed selections', async () => {
  let selected: string | null = 'first';
  const closed = vi.fn(() => Promise.resolve());
  const database = { all: vi.fn(), batch: vi.fn() };
  const connection: StorageConnection = {
    database,
    objects: { get: vi.fn(), put: vi.fn() },
    read: (operation) => operation(database),
    close: closed,
  };
  const connect = vi
    .fn(() => Promise.resolve(connection))
    .mockRejectedValueOnce(new Error('Unavailable'));
  const load = createStorageLoader(() => selected, connect);
  await expect(load()).rejects.toThrow('Unavailable');
  expect(await load()).toBe(connection);
  expect(await load()).toBe(connection);
  expect(connect).toHaveBeenCalledTimes(2);
  selected = 'second';
  await load();
  expect(closed).toHaveBeenCalledTimes(1);
  selected = null;
  expect(await load()).toBeNull();
  expect(closed).toHaveBeenCalledTimes(2);
});
