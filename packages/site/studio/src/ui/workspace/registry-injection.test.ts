import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { createProject, type StudioProject } from '../../data/index.js';
import { createContentRegistry } from '@frontend/puck-adapter/schema';
import { createNavigationCatalog, defineNavigationPreset } from '@frontend/content-blocks/schema';
import { useStudioPageWorkspace } from './use-page-workspace.js';

const registry = createContentRegistry({
  navigationPresentations: createNavigationCatalog({
    parts: { title: {}, item: {}, progress: {} },
    presets: {
      quiet: defineNavigationPreset(z.strictObject({}), () => ({
        title: { id: 'default' },
        item: { id: 'default' },
        progress: { id: 'default' },
      })),
    },
  }),
});
const project: StudioProject = {
  ...createProject('neutral-registry'),
  document: {
    documentId: 'neutral-registry',
    schemaVersion: 1,
    revision: 1,
    data: {
      root: {},
      content: [
        {
          type: 'ContentNavigation',
          props: {
            id: 'reading',
            label: 'Contents',
            progressLabel: 'Progress',
            presentation: { preset: 'quiet' },
            items: [{ label: 'Introduction', href: '#intro' }],
            content: [
              {
                type: 'Anchor',
                props: {
                  id: 'anchor',
                  name: 'intro',
                  content: [
                    { type: 'Heading', props: { id: 'heading', text: 'A neutral introduction' } },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  },
};
it('uses the injected registry across import, JSON apply and Puck snapshots without changing neutral defaults', () => {
  const neutral = renderHook(() => useStudioPageWorkspace(project));
  expect(neutral.result.current.session.errors.length).toBeGreaterThan(0);
  const owned = renderHook(() => useStudioPageWorkspace(project, { registry }));
  expect(owned.result.current.session.registry).toBe(registry);
  expect(owned.result.current.session.errors).toEqual([]);
  act(() => owned.result.current.drafts.change('context', '{"selected":true}'));
  act(() => expect(owned.result.current.drafts.apply()).toBe(true));
  expect(owned.result.current.session.project.context).toEqual({ selected: true });
  act(() =>
    owned.result.current.session.onSnapshot({
      document: { ...project.document, revision: 2 },
      issues: [],
      invalidFieldIds: [],
      hasUnappliedChanges: false,
      canExport: true,
    })
  );
  expect(owned.result.current.session.project.document.revision).toBe(2);
  expect(owned.result.current.session.errors).toEqual([]);
  act(() => {
    owned.result.current.session.open(project, { filename: 'quiet.studio.json' });
  });
  expect(owned.result.current.session.pending).not.toBeNull();
  act(() => owned.result.current.session.confirmReplacement());
  expect(owned.result.current.session.project.document.documentId).toBe('neutral-registry');
  expect(owned.result.current.session.errors).toEqual([]);
});

it('blocks saving and exporting unresolved cross-node edits until they are repaired', () => {
  const { result } = renderHook(() => useStudioPageWorkspace(project, { registry }));
  expect(result.current.session.flags.canSave).toBe(true);
  act(() =>
    result.current.session.onSnapshot({
      document: project.document,
      invalidFieldIds: [],
      issues: [{ code: 'invalid-anchor', path: [], message: 'The navigation target is missing.' }],
      hasUnappliedChanges: true,
      canExport: false,
    })
  );
  expect(result.current.session.flags.canSave).toBe(false);
  expect(result.current.session.project.document).toEqual(project.document);
  act(() =>
    result.current.session.onSnapshot({
      document: project.document,
      invalidFieldIds: [],
      issues: [{ code: 'missing-value', path: [], message: 'Preview context is incomplete.' }],
      hasUnappliedChanges: false,
      canExport: false,
    })
  );
  expect(result.current.session.flags.canSave).toBe(true);
});
