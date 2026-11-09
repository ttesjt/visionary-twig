import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createProject, parseProject } from '@frontend/studio/data';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import { useProjectSession } from '@frontend/studio/session';
import { createMemoryDemoAdapter } from '../adapters/memory-data';
import { usePageOperation } from './use-page-operation';
import type { DemoPageAdapter } from './contracts';
it('publishes the captured snapshot and keeps edits made during publication dirty', async () => {
  const data = createMemoryDemoAdapter([]);
  let finish: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const pages: DemoPageAdapter = {
    ...data.pages,
    publish: async (input, signal) => {
      await ready;
      return data.pages.publish(input, signal);
    },
  };
  const initial = {
    id: 'page',
    title: 'A page',
    revision: 0,
    itemId: null,
    project: createProject('document'),
  };
  const { result } = renderHook(() => {
    const session = useProjectSession(initial.project, { associations: 'host' });
    return { session, operations: usePageOperation(session, pages, initial) };
  });
  let pending = Promise.resolve();
  act(() => {
    pending = result.current.operations.execute('publish');
  });
  act(() => {
    result.current.session.run(
      parseProject({ ...result.current.session.project, context: { newer: true } }, contentRegistry)
    );
  });
  await act(async () => {
    finish();
    await pending;
  });
  expect(result.current.operations.resource.revision).toBe(1);
  expect(result.current.session.project.context).toEqual({ newer: true });
  expect(result.current.session.flags.unpublished).toBe(true);
  const stored = await data.pages.load('page', new AbortController().signal);
  if (stored.status !== 'found') throw new Error(stored.status);
  expect(stored.page.project.context).toEqual({});
});
