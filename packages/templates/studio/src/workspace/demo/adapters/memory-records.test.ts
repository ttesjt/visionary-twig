import { expect, it, vi } from 'vitest';
import { createMemoryDemoAdapter } from './memory-data';
const createMemoryRecordAdapter = (seed: Parameters<typeof createMemoryDemoAdapter>[0]) =>
  createMemoryDemoAdapter(seed).records;
import { createBlobImageAdapter } from './blob-images';
const record = { id: 'created-record', title: 'Created', summary: '', status: 'draft' as const };
it('creates arbitrary valid identities, notifies readers and makes exact retries idempotent', async () => {
  const store = createMemoryRecordAdapter([]);
  const listener = vi.fn();
  const unsubscribe = store.subscribe(listener);
  const original = store.getSnapshot();
  await store.create(record, new AbortController().signal);
  expect(original).toEqual([]);
  expect(store.getSnapshot()).toEqual([record]);
  await store.create(record, new AbortController().signal);
  expect(listener).toHaveBeenCalledOnce();
  expect(() =>
    store.create({ ...record, title: 'Different' }, new AbortController().signal)
  ).toThrow('conflict');
  unsubscribe();
  await store.update({ ...record, title: 'Updated' }, new AbortController().signal, record);
  expect(listener).toHaveBeenCalledOnce();
});
it('does not mutate the store for an aborted request', () => {
  const store = createMemoryRecordAdapter([]);
  const controller = new AbortController();
  controller.abort();
  expect(() => store.create(record, controller.signal)).toThrow();
  expect(store.getSnapshot()).toEqual([]);
});
it('releases only owned object URLs and disposes remaining media exactly once', async () => {
  const revoke = vi.fn();
  const create = vi.fn(() => 'blob:http://localhost/image');
  const images = createBlobImageAdapter({ create, revoke });
  const image = await images.upload(new File(['x'], 'a.png'), new AbortController().signal);
  images.release({ url: 'https://example.test/existing.png' });
  expect(revoke).not.toHaveBeenCalled();
  images.release(image);
  images.dispose();
  images.dispose();
  expect(revoke).toHaveBeenCalledExactlyOnceWith(image.url);
});

it('updates only the selected record without mutating caller-owned seeds or old snapshots', async () => {
  const seed = [record, { ...record, id: 'other-record', title: 'Other' }];
  const store = createMemoryRecordAdapter(seed);
  const before = store.getSnapshot();
  await store.update({ ...record, title: 'Changed' }, new AbortController().signal, record);
  expect(store.getSnapshot()[0]?.title).toBe('Changed');
  expect(store.getSnapshot()[1]).toBe(before[1]);
  expect(before[0]?.title).toBe('Created');
  expect(seed[0]?.title).toBe('Created');
});

it('awaits explicit acknowledgements and rejects stale, missing or cancelled updates without mutation', async () => {
  const store = createMemoryRecordAdapter([record]);
  const signal = new AbortController().signal;
  await expect(store.update({ ...record, title: 'Saved' }, signal, record)).resolves.toMatchObject({
    status: 'saved',
    record: { title: 'Saved' },
  });
  const before = store.getSnapshot();
  await expect(store.update({ ...record, title: 'Stale draft' }, signal, record)).resolves.toEqual({
    status: 'conflict',
  });
  await expect(store.update({ ...record, id: 'missing' }, signal, record)).resolves.toEqual({
    status: 'not-found',
  });
  const controller = new AbortController();
  controller.abort();
  await expect(store.update(record, controller.signal, record)).resolves.toEqual({
    status: 'cancelled',
  });
  expect(store.getSnapshot()).toBe(before);
});
