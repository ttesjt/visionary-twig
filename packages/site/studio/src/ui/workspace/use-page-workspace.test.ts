import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createProject } from '../../data/index.js';
import { useStudioPageWorkspace } from './use-page-workspace.js';
it('retains staged source and applied history while the host changes its rendered mode', () => {
  const initial = createProject('retained-page');
  const { result, rerender } = renderHook(
    ({ mode }) => ({ mode, ...useStudioPageWorkspace(initial) }),
    { initialProps: { mode: 'viewer' } }
  );
  act(() => result.current.drafts.change('context', '{"retained":true}'));
  rerender({ mode: 'json' });
  expect(result.current.drafts.pending).toBe(true);
  expect(result.current.drafts.text('context')).toBe('{"retained":true}');
  act(() => {
    expect(result.current.drafts.apply()).toBe(true);
  });
  rerender({ mode: 'viewer' });
  expect(result.current.session.project.context).toEqual({ retained: true });
  act(() => result.current.session.dispatch({ type: 'undo' }));
  expect(result.current.session.project.context).toEqual({});
  act(() => result.current.session.dispatch({ type: 'redo' }));
  expect(result.current.session.project.context).toEqual({ retained: true });
});
it('injected local saving writes the applied snapshot, independently of remote publication', async () => {
  const initial = {
    ...createProject('local-page'),
    publishing: { target: { targetId: 'host', key: 'resource', version: { revision: 3 } } },
  };
  let saved = '';
  const adapter = {
    saveAs: ({ text }: { readonly text: string }) => {
      saved = text;
      return Promise.resolve({
        status: 'saved' as const,
        location: { name: 'working.studio.json', write: () => Promise.resolve() },
      });
    },
  };
  const { result } = renderHook(() => useStudioPageWorkspace(initial, {}, { adapter }));
  act(() => result.current.drafts.change('context', '{"local":true}'));
  act(() => {
    result.current.drafts.apply();
  });
  await act(async () => {
    await result.current.files.save();
  });
  expect(JSON.parse(saved)).toMatchObject({
    context: { local: true },
    publishing: initial.publishing,
  });
  expect(result.current.files.location?.name).toBe('working.studio.json');
  expect(result.current.session.flags.needsSave).toBe(false);
  expect(result.current.session.flags.unpublished).toBe(true);
});
