import { expect, it, vi } from 'vitest';
import { createProject } from '@frontend/studio/data';
import { createMemoryDemoAdapter } from './memory-data';
import type { DemoPageResult, DemoPageWrite } from '../pages/contracts';
const signal = () => new AbortController().signal;
const seed = () => [
  { id: 'first', title: 'First item', summary: '', status: 'draft' as const },
  { id: 'second', title: 'Second item', summary: '', status: 'draft' as const },
];
const write = (overrides: Partial<DemoPageWrite> = {}): DemoPageWrite => ({
  id: 'page',
  title: 'A page',
  expectedRevision: 0,
  expectedItemId: null,
  itemId: null,
  project: createProject('document'),
  locales: ['en'],
  ...overrides,
});
function found(result: DemoPageResult) {
  if (result.status !== 'found') throw new Error(result.status);
  return result.page;
}
it('publishes independent complete pages, returns owned content and keeps a stable revision check', async () => {
  const data = createMemoryDemoAdapter(seed());
  const project = {
    ...createProject('document'),
    catalogs: { en: { title: 'Title' }, zh: { title: '标题' } },
    context: { extra: true },
    publishing: { target: { targetId: 'foreign', key: 'elsewhere' } },
  };
  const page = found(await data.pages.publish(write({ project, locales: ['en', 'zh'] }), signal()));
  expect(page).toMatchObject({ id: 'page', revision: 1, itemId: null });
  expect(data.records.getSnapshot().every((record) => !record.pageId)).toBe(true);
  expect(page.project.catalogs).toEqual(project.catalogs);
  expect(page.project.publishing).toBeUndefined();
  Object.defineProperty(page.project.context, 'extra', { value: false });
  expect(found(await data.pages.load('page', signal())).project.context.extra).toBe(true);
  expect(await data.pages.publish(write(), signal())).toEqual({ status: 'conflict' });
});
it('commits page and one-to-one item association together before notifying readers', async () => {
  const data = createMemoryDemoAdapter(seed());
  const listener = vi.fn(() => {
    expect(data.records.getSnapshot()[0]?.pageId).toBe('page');
    expect(data.pages.getSnapshot()[0]?.revision).toBe(1);
  });
  data.pages.subscribe(listener);
  const page = found(await data.pages.publish(write({ itemId: 'first' }), signal()));
  expect(page.itemId).toBe('first');
  expect(listener).toHaveBeenCalledOnce();
  expect(await data.pages.publish(write({ id: 'other', itemId: 'first' }), signal())).toEqual({
    status: 'conflict',
  });
  expect(
    await data.pages.publish(
      write({ expectedRevision: 1, expectedItemId: 'first', itemId: 'second' }),
      signal()
    )
  ).toEqual({ status: 'conflict' });
  expect(data.pages.getSnapshot()).toHaveLength(1);
});
it('unlink preserves the page, increments the revision and prevents stale publication from restoring its old association', async () => {
  const data = createMemoryDemoAdapter(seed());
  await data.pages.publish(write({ itemId: 'first' }), signal());
  const detached = found(
    await data.pages.unlink({ id: 'page', expectedRevision: 1, expectedItemId: 'first' }, signal())
  );
  expect(detached).toMatchObject({ revision: 2, itemId: null });
  expect(data.records.getSnapshot()[0]?.pageId).toBeUndefined();
  expect(
    await data.pages.publish(
      write({ expectedRevision: 1, expectedItemId: 'first', itemId: 'first' }),
      signal()
    )
  ).toEqual({ status: 'conflict' });
  expect(
    found(await data.pages.publish(write({ expectedRevision: 2, itemId: 'second' }), signal()))
      .itemId
  ).toBe('second');
});
it('item edits cannot overwrite page associations, and invalid or cancelled operations mutate nothing', async () => {
  const data = createMemoryDemoAdapter(seed());
  const stale = data.records.getSnapshot()[0];
  if (!stale) throw new Error('Missing seed');
  await data.pages.publish(write({ itemId: 'first' }), signal());
  await data.records.update({ ...stale, title: 'Updated fields' }, signal(), stale);
  expect(data.records.getSnapshot()[0]?.pageId).toBe('page');
  const before = data.pages.getSnapshot();
  const controller = new AbortController();
  controller.abort();
  expect(
    await data.pages.unlink(
      { id: 'page', expectedRevision: 1, expectedItemId: 'first' },
      controller.signal
    )
  ).toEqual({ status: 'cancelled' });
  expect(
    (await data.pages.publish(write({ id: 'invalid', project: { bad: true } }), signal())).status
  ).toBe('invalid');
  expect(data.pages.getSnapshot()).toBe(before);
});
