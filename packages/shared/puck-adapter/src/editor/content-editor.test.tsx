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
