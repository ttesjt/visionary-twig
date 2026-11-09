import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { z } from 'zod';
import { componentSchemas, COMPONENT_NAMES, contentRegistry } from '@frontend/puck-adapter/schema';
import { resolveDocument, type ContentDocument } from '@frontend/ui-document';
import { editorDefaults } from '../src/editor/defaults.js';
import {
  normalizeEditorData,
  nodeIdAtZone,
  previewPropsById,
  restoreNativeHistory,
} from '../src/editor/native-data.js';
import { EditorRuntimeContext } from '../src/editor/editor-context.js';
import { SemanticField } from '../src/editor/semantic-field.js';

describe('editor contracts and controlled fields', () => {
  it('starts every registered node with valid real schema props', () => {
    for (const name of COMPONENT_NAMES) {
      const props = { ...editorDefaults[name], id: name };
      const result = resolveDocument(
        {
          documentId: 'defaults',
          schemaVersion: 1,
          revision: 1,
          data: { root: {}, content: [{ type: name, props }] },
        },
        contentRegistry
      );
      expect(result.ok, name).toBe(true);
    }
  });
  it('normalizes only Puck bookkeeping and uses native slot traversal for preview/duplicate lookup', () => {
    const data = {
      root: { props: { id: 'root', title: '' } },
      zones: {},
      content: [
        {
          type: 'Column',
          props: {
            id: 'layout',
            content: [{ type: 'Heading', props: { id: 'title', text: 'Static' } }],
          },
        },
      ],
    };
    expect(normalizeEditorData(data)).toMatchObject({ root: { props: {} } });
    expect(nodeIdAtZone(data, 'layout:content', 0)).toBe('title');
    const parsed = resolveDocument(
      { documentId: 'editor', schemaVersion: 1, revision: 1, data: normalizeEditorData(data) },
      contentRegistry
    );
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
    expect(previewPropsById(parsed.value.data).get('title')?.text).toBe('Static');
    expect(componentSchemas.Heading.safeParse({ text: 'x', style: {} }).success).toBe(false);
  });
  it('keeps invalid structured drafts out of Puck data and reports their save-blocking state', () => {
    const changed = vi.fn<(value: unknown) => void>();
    const draftChanged = vi.fn<(id: string, invalid: boolean) => void>();
    const document = {
      documentId: 'field',
      schemaVersion: 1,
      revision: 1,
      data: { root: {}, content: [] },
    } as const;
    const view = (value: unknown) => (
      <EditorRuntimeContext.Provider
        value={{
          document,
          nodeIds: new Set(),
          propsById: new Map(),
          issues: [],
          unbind: () => ({ ok: true, value: document }),
          draftChanged,
        }}
      >
        <SemanticField
          id="body"
          label="Rich text"
          schema={componentSchemas.RichText.shape.content}
          value={value}
          readOnly={false}
          onChange={changed}
        />
      </EditorRuntimeContext.Provider>
    );
    const { rerender } = render(view([]));
    const field = screen.getByLabelText('Rich text');
    fireEvent.change(field, { target: { value: '<script>bad</script>' } });
    expect(changed).not.toHaveBeenCalled();
    expect(draftChanged).toHaveBeenLastCalledWith('body', true);
    fireEvent.change(field, {
      target: { value: '[{"type":"paragraph","content":[{"type":"text","text":"Valid"}]}]' },
    });
    expect(changed).toHaveBeenCalledOnce();
    expect(draftChanged).toHaveBeenLastCalledWith('body', false);
    fireEvent.change(field, { target: { value: '{broken' } });
    rerender(view([{ type: 'paragraph', content: [{ type: 'text', text: 'History value' }] }]));
    if (!(field instanceof HTMLTextAreaElement)) throw new Error('Expected a structured textarea');
    expect(field.value).toBe(
      JSON.stringify(
        [{ type: 'paragraph', content: [{ type: 'text', text: 'History value' }] }],
        null,
        2
      )
    );
    expect(draftChanged).toHaveBeenLastCalledWith('body', false);
  });
  it('offers finite enum options and preserves number/boolean values', () => {
    const changed = vi.fn<(value: unknown) => void>();
    render(
      <SemanticField
        id="level"
        label="Heading level"
        schema={z.literal([1, 2, 3])}
        value={2}
        readOnly={false}
        onChange={changed}
      />
    );
    fireEvent.change(screen.getByLabelText('Heading level'), { target: { value: '3' } });
    expect(changed).toHaveBeenCalledWith(3);
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Default',
      '1',
      '2',
      '3',
    ]);
  });
});

it('native undo restores only historical canvas content and bindings, keeping current host metadata', () => {
  const historical: ContentDocument = {
    documentId: 'neutral-history',
    schemaVersion: 1,
    revision: 1,
    data: { root: {}, content: [{ type: 'Heading', props: { id: 'title', text: '' } }] },
    variables: { copy: { title: 'Old' } },
    bindings: [{ nodeId: 'title', targetPath: ['text'], sourcePath: ['copy', 'title'] }],
  };
  const current = {
    ...historical,
    revision: 7,
    locale: 'zh',
    variables: { copy: { title: 'Current value' } },
    data: { root: {}, content: [] },
    bindings: [],
  };
  const restored = restoreNativeHistory(current, historical);
  expect(restored).toMatchObject({
    revision: 7,
    locale: 'zh',
    variables: current.variables,
    data: historical.data,
    bindings: historical.bindings,
  });
  expect(current.data.content).toEqual([]);
});
