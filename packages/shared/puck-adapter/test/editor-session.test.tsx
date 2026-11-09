import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useState, type ComponentProps } from 'react';
import type { Puck } from '@puckeditor/core';
import { ContentEditor } from '../src/editor/content-editor.js';
import type { ContentEditorSnapshot } from '@frontend/puck-adapter/editor';
import type { ContentDocument, ContentSaveResult } from '@frontend/ui-document';
import { SemanticField } from '../src/editor/semantic-field.js';
import { componentSchemas } from '@frontend/puck-adapter/schema';

// Isolate the adapter's host contract. Native Puck actions/history run in Chromium.
vi.mock('@puckeditor/core', () => ({
  createUsePuck: () => () => {
    throw new Error('Native subscriptions run in Chromium.');
  },
  usePuck: vi.fn(),
  Puck: ({
    data,
    onChange,
    overrides,
  }: Pick<ComponentProps<typeof Puck>, 'data' | 'onChange' | 'overrides'>) => {
    const [visible, show] = useState(true);
    return (
      <>
        <button onClick={() => onChange?.({ ...data, root: data.root ?? {}, content: [] })}>
          Clear nodes
        </button>
        <button onClick={() => show((value) => !value)}>Toggle field inspector</button>
        {visible && (
          <SemanticField
            id="draft"
            label="Structured draft"
            schema={componentSchemas.RichText.shape.content}
            value={[]}
            readOnly={false}
            onChange={() => {}}
          />
        )}
        {overrides?.headerActions?.({ children: null })}
      </>
    );
  },
}));

const document: ContentDocument = {
  documentId: 'contract',
  schemaVersion: 1,
  revision: 1,
  data: { root: {}, content: [{ type: 'Heading', props: { id: 'title', text: '' } }] },
  variables: { content: { title: 'Resolved title' } },
  bindings: [{ nodeId: 'title', targetPath: ['text'], sourcePath: ['content', 'title'] }],
};

describe('editor host contract', () => {
  it('notifies raw snapshots, blocks invalid drafts and permits replacing Save', async () => {
    const changed = vi.fn<(snapshot: ContentEditorSnapshot) => void>();
    render(
      <ContentEditor
        document={document}
        onSnapshotChange={changed}
        headerActions={(snapshot) => (
          <button disabled={!snapshot.canExport}>Export snapshot</button>
        )}
      />
    );
    await waitFor(() => expect(changed).toHaveBeenCalled());
    expect(changed.mock.lastCall?.[0]).toMatchObject({ document, canExport: true });
    expect(screen.queryByText('Save document')).toBeNull();
    fireEvent.change(screen.getByLabelText('Structured draft'), { target: { value: '{broken' } });
    await waitFor(() =>
      expect(changed.mock.lastCall?.[0]).toMatchObject({
        canExport: false,
        invalidFieldIds: ['draft'],
        document,
      })
    );
    expect(screen.getByRole('button', { name: 'Export snapshot' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Structured draft'), { target: { value: '[]' } });
    await waitFor(() => expect(changed.mock.lastCall?.[0]?.canExport).toBe(true));
  });
  it('keeps initial data stable until an explicit same-ID/revision replacement', async () => {
    const changed = vi.fn<(snapshot: ContentEditorSnapshot) => void>();
    const replacement = { ...document, variables: { content: { title: 'Replacement' } } };
    const { rerender } = render(
      <ContentEditor document={document} sessionKey="one" onSnapshotChange={changed} />
    );
    fireEvent.click(screen.getByText('Clear nodes'));
    await waitFor(() => expect(changed.mock.lastCall?.[0]?.document.data.content).toEqual([]));
    rerender(<ContentEditor document={replacement} sessionKey="one" onSnapshotChange={changed} />);
    expect(changed.mock.lastCall?.[0]?.document.data.content).toEqual([]);
    rerender(<ContentEditor document={replacement} sessionKey="two" onSnapshotChange={changed} />);
    await waitFor(() => expect(changed.mock.lastCall?.[0]?.document).toEqual(replacement));
  });
  it('preserves submitted-snapshot semantics when editing during a save', async () => {
    let finish: (result: ContentSaveResult) => void = () => {};
    const pending = new Promise<ContentSaveResult>((resolve) => {
      finish = resolve;
    });
    const save = vi.fn(() => pending);
    render(<ContentEditor document={document} onSave={save} />);
    fireEvent.click(screen.getByText('Save document'));
    expect(save).toHaveBeenCalledWith(document, expect.any(AbortSignal));
    fireEvent.click(screen.getByText('Clear nodes'));
    finish({ status: 'saved', version: { revision: 2 } });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Newer edits are not saved.')
    );
  });
  it('reports conflicts without replacing the current raw snapshot', async () => {
    const changed = vi.fn<(snapshot: ContentEditorSnapshot) => void>();
    const save = vi.fn(() => Promise.resolve<ContentSaveResult>({ status: 'conflict' }));
    render(<ContentEditor document={document} onSave={save} onSnapshotChange={changed} />);
    fireEvent.click(screen.getByText('Save document'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Version conflict.'));
    expect(changed.mock.lastCall?.[0]?.document).toEqual(document);
  });
  it('aborts an active save when replacing a session', () => {
    const save = vi.fn(
      (_document: ContentDocument, _signal: AbortSignal) => new Promise<ContentSaveResult>(() => {})
    );
    const { rerender } = render(
      <ContentEditor document={document} sessionKey="one" onSave={save} />
    );
    fireEvent.click(screen.getByText('Save document'));
    const signal = save.mock.lastCall?.[1];
    rerender(<ContentEditor document={document} sessionKey="two" onSave={save} />);
    expect(signal?.aborted).toBe(true);
  });
});

it('retains invalid field buffers when their inspector unmounts and scopes them by language', async () => {
  const changed = vi.fn<(snapshot: ContentEditorSnapshot) => void>();
  const view = (scope: string) => (
    <ContentEditor
      document={document}
      fieldScope={scope}
      sessionKey="retained"
      onSnapshotChange={changed}
    />
  );
  const { rerender } = render(view('en'));
  fireEvent.change(screen.getByLabelText('Structured draft'), {
    target: { value: '{unfinished english' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Toggle field inspector' }));
  expect(changed.mock.lastCall?.[0]?.canExport).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Toggle field inspector' }));
  expect(screen.getByLabelText('Structured draft')).toHaveValue('{unfinished english');
  rerender(view('zh'));
  expect(screen.getByLabelText('Structured draft')).toHaveValue('[]');
  fireEvent.change(screen.getByLabelText('Structured draft'), {
    target: { value: '[unfinished translated' },
  });
  rerender(view('en'));
  expect(screen.getByLabelText('Structured draft')).toHaveValue('{unfinished english');
  fireEvent.change(screen.getByLabelText('Structured draft'), { target: { value: '[]' } });
  expect(changed.mock.lastCall?.[0]?.canExport).toBe(false);
  rerender(view('zh'));
  expect(screen.getByLabelText('Structured draft')).toHaveValue('[unfinished translated');
  fireEvent.change(screen.getByLabelText('Structured draft'), { target: { value: '[]' } });
  await waitFor(() => expect(changed.mock.lastCall?.[0]?.canExport).toBe(true));
});
