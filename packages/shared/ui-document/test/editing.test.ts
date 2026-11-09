import { describe, expect, it } from 'vitest';
import { reconcileDocumentEdit, resolveDocument, unbindDocumentField } from '@frontend/ui-document';
import { fixture, registry, findProps, freezeDeep } from './fixtures.js';
import { code, unwrap } from './helpers.js';

describe('raw document/editor round trips', () => {
  it('retains bindings and placeholders when a node moves', () => {
    const original = fixture();
    const resolved = unwrap(resolveDocument(original, registry));
    const title = { type: 'Heading', props: { id: 'title', text: '', level: 2 } };
    const next = unwrap(reconcileDocumentEdit(original, { root: {}, content: [title] }, registry));
    expect(next.bindings).toEqual(original.bindings);
    expect(JSON.stringify(next.data)).toContain('"text":""');
    expect(unwrap(resolveDocument(next, registry)).data.content[0]?.props.text).toBe(
      'Sample article'
    );
    expect(resolved.document).toEqual(original);
  });
  it('clears bindings of deleted descendants and preserves other bindings', () => {
    const original = fixture();
    freezeDeep(original);
    const next = unwrap(reconcileDocumentEdit(original, { root: {}, content: [] }, registry));
    expect(next.bindings).toEqual([]);
    expect(original.bindings).toHaveLength(1);
  });
  it('copies subtree bindings to fresh IDs assigned by the native editor', () => {
    const original = fixture();
    const copy = {
      type: 'Layout',
      props: {
        id: 'copy',
        content: [{ type: 'Heading', props: { id: 'copy-title', text: '', level: 2 } }],
      },
    };
    const data = {
      root: {},
      content: [
        {
          type: 'Layout',
          props: {
            id: 'inner',
            content: [{ type: 'Heading', props: { id: 'title', text: '', level: 2 } }],
          },
        },
        copy,
      ],
    };
    const source = { ...original, data: { root: {}, content: [data.content[0]] } };
    const next = unwrap(
      reconcileDocumentEdit(source, data, registry, {
        duplicate: { sourceNodeId: 'inner', targetNodeId: 'copy' },
      })
    );
    expect(next.bindings?.map((binding) => binding.nodeId)).toEqual(['title', 'copy-title']);
    const preview = unwrap(resolveDocument(next, registry));
    expect(findProps(preview.data, 'copy-title').text).toBe('Sample article');
    expect(findProps(next.data, 'copy-title').text).toBe('');
  });
  it('rejects ambiguous/mismatched duplicate structure and reused IDs', () => {
    const input = fixture();
    expect(
      code(
        reconcileDocumentEdit(input, input.data, registry, {
          duplicate: { sourceNodeId: 'outer', targetNodeId: 'inner' },
        })
      )
    ).toBe('invalid-duplicate');
  });
  it('rechecks resource limits after copying bindings or materializing a value', () => {
    const input = fixture();
    const title = { type: 'Heading', props: { id: 'title', text: '', level: 2 } };
    expect(
      code(
        reconcileDocumentEdit(
          input,
          { root: {}, content: [title, { ...title, props: { ...title.props, id: 'copy' } }] },
          registry,
          { duplicate: { sourceNodeId: 'title', targetNodeId: 'copy' }, limits: { maxBindings: 1 } }
        )
      )
    ).toBe('too-many-bindings');
    const shrinking = {
      ...input,
      data: {
        root: {},
        content: [
          { ...title, props: { ...title.props, text: 'x'.repeat(800) } },
          { ...title, props: { ...title.props, id: 'other' } },
        ],
      },
      variables: { tiny: 'ok', large: 'y'.repeat(800) },
      bindings: [
        { nodeId: 'title', targetPath: ['text'], sourcePath: ['tiny'] },
        { nodeId: 'other', targetPath: ['text'], sourcePath: ['large'] },
      ],
    };
    const options = {
      limits: { maxBytes: new TextEncoder().encode(JSON.stringify(shrinking)).byteLength + 50 },
    };
    expect(resolveDocument(shrinking, registry, options).ok).toBe(true);
    expect(code(unbindDocumentField(shrinking, 'other', ['text'], registry, options))).toBe(
      'document-too-large'
    );
  });
  it('does not allow resolved preview or edited bound fields to overwrite raw values', () => {
    const input = fixture();
    expect(
      code(reconcileDocumentEdit(input, unwrap(resolveDocument(input, registry)).data, registry))
    ).toBe('bound-field-edit');
  });
  it('unbinds exactly one field using a copy of its current resolved value', () => {
    const input = fixture();
    freezeDeep(input);
    const unbound = unwrap(unbindDocumentField(input, 'title', ['text'], registry));
    expect(unbound.bindings).toEqual([]);
    expect(findProps(unbound.data, 'title').text).toBe('Sample article');
    expect(findProps(input.data, 'title').text).toBe('');
    expect(resolveDocument(unbound, registry).ok).toBe(true);
    expect(code(unbindDocumentField(input, 'title', ['level'], registry))).toBe('missing-binding');
  });
  it('allows transient invalid static props but full save validation still fails', () => {
    const input = { ...fixture(), bindings: [] };
    const next = unwrap(
      reconcileDocumentEdit(
        input,
        { root: {}, content: [{ type: 'Heading', props: { id: 'static', text: '', level: 2 } }] },
        registry
      )
    );
    expect(resolveDocument(next, registry).ok).toBe(false);
  });
});
