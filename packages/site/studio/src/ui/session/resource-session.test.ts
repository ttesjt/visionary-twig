import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createProject, parseProject } from '../../data/index.js';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import { useProjectSession } from './use-project-session.js';
const target = { targetId: 'neutral-pages', key: 'owned-page', version: { revision: 3 } };
it('retains host identity through file, full-project JSON and new-content replacement without claiming a modified file is saved', () => {
  const initial = { ...createProject('original'), publishing: { target } };
  const incoming = {
    ...createProject('imported'),
    publishing: { target: { targetId: 'foreign', key: 'other', version: { revision: 90 } } },
  };
  const { result } = renderHook(() =>
    useProjectSession(initial, { associations: 'host', published: true })
  );
  expect(result.current.flags.unpublished).toBe(false);
  expect(result.current.flags.needsSave).toBe(true);
  act(() => {
    result.current.open(incoming, { filename: 'imported.json', saved: true });
  });
  expect(result.current.project.document.documentId).toBe('imported');
  expect(result.current.project.publishing).toEqual({ target });
  expect(result.current.flags.needsSave).toBe(true);
  expect(result.current.flags.unpublished).toBe(true);
  act(() => {
    result.current.run(parseProject(incoming, contentRegistry));
  });
  expect(result.current.project.publishing).toEqual({ target });
  act(() => {
    result.current.newProject();
  });
  if (result.current.pending) act(() => result.current.confirmReplacement());
  expect(result.current.project.publishing).toEqual({ target });
});
it('does not adopt an imported target for a host-owned unassociated session, while default file mode keeps portable targets', () => {
  const incoming = { ...createProject('imported'), publishing: { target } };
  const owned = renderHook(() => useProjectSession(undefined, { associations: 'host' }));
  act(() => {
    owned.result.current.open(incoming, { filename: 'source.json' });
  });
  expect(owned.result.current.project.publishing).toBeUndefined();
  const portable = renderHook(() => useProjectSession());
  act(() => {
    portable.result.current.open(incoming, { filename: 'source.json' });
  });
  expect(portable.result.current.project.publishing).toEqual({ target });
});

it('uses the latest host revision when accepting an import that was awaiting replacement confirmation', () => {
  const { result } = renderHook(() =>
    useProjectSession(
      { ...createProject('current'), publishing: { target } },
      { associations: 'host' }
    )
  );
  act(() => {
    result.current.run(
      parseProject({ ...result.current.project, context: { dirty: true } }, contentRegistry)
    );
  });
  act(() => {
    result.current.open(createProject('replacement'), { filename: 'replacement.json' });
  });
  expect(result.current.pending).not.toBeNull();
  act(() => {
    result.current.dispatch({ type: 'target', target: { ...target, version: { revision: 4 } } });
  });
  act(() => result.current.confirmReplacement());
  expect(result.current.project.document.documentId).toBe('replacement');
  expect(result.current.project.publishing?.target?.version?.revision).toBe(4);
});
