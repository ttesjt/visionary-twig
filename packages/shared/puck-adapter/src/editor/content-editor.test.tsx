import { afterEach, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { ContentSaveResult } from '@frontend/ui-document';
import { ContentEditor, type ContentEditorSnapshot } from './content-editor.js';
vi.mock('@puckeditor/core', () => ({
  createUsePuck: () => () => {
    throw new Error('Native subscriptions run in Chromium.');
  },
  Puck: ({ overrides }: { readonly overrides?: { readonly headerActions?: () => ReactNode } }) => (
    <>{overrides?.headerActions?.()}</>
  ),
}));
afterEach(cleanup);
it('notifies the host after an internal Save advances revision, even before parent props catch up', async () => {
  const onSnapshot = vi.fn<(snapshot: ContentEditorSnapshot) => void>();
  const save = vi.fn(() =>
    Promise.resolve<ContentSaveResult>({ status: 'saved', version: { revision: 2 } })
  );
  const document = {
    documentId: 'neutral-save',
    schemaVersion: 1,
    revision: 1,
    data: {
      root: {},
      content: [{ type: 'Heading', props: { id: 'title', text: 'A neutral title' } }],
    },
  };
  render(<ContentEditor document={document} onSave={save} onSnapshotChange={onSnapshot} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save document' }));
  await waitFor(() => expect(onSnapshot.mock.calls.at(-1)?.[0].document.revision).toBe(2));
  expect(save).toHaveBeenCalledOnce();
});

it('uses the injected neutral registry during initial parsing, preview and Save', async () => {
  const { createContentRegistry, contentRegistry } =
    await import('../registry/content-registry.js');
  const { createNavigationCatalog, defineNavigationPreset } =
    await import('@frontend/content-blocks/schema');
  const { z } = await import('zod');
  const { editorDefaults } = await import('./defaults.js');
  const { resolveDocument } = await import('@frontend/ui-document');
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
  const document = {
    documentId: 'quiet-page',
    schemaVersion: 1,
    revision: 1,
    data: {
      root: {},
      content: [
        {
          type: 'ContentNavigation',
          props: {
            id: 'reading',
            ...editorDefaults.ContentNavigation,
            presentation: { preset: 'quiet' },
          },
        },
      ],
    },
  };
  expect(resolveDocument(document, contentRegistry).ok).toBe(false);
  const onSave = vi.fn(() =>
    Promise.resolve<ContentSaveResult>({ status: 'saved', version: { revision: 2 } })
  );
  render(<ContentEditor document={document} registry={registry} onSave={onSave} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save document' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
  expect(onSave.mock.calls[0]).toBeDefined();
  expect(screen.queryByRole('alert')).toBeNull();
});
