import { describe, expect, it } from 'vitest';
import { parseDocument, resolveDocument, validateResolvedData } from '@frontend/ui-document';
import { fixture, registry } from './fixtures.js';
import { unwrap, code, simple } from './helpers.js';

describe('versioned envelope and tree structure', () => {
  it('supports exact nested slot paths and rejects binding their ancestors', () => {
    const nestedRegistry = {
      ...registry,
      nodes: {
        ...registry.nodes,
        Nested: {
          slots: [{ path: ['layout', 'body'], allowedTypes: ['Heading'] }],
          validateProps: () => [],
          isBindingTarget: () => true,
        },
      },
    };
    const document = {
      ...simple(),
      data: {
        root: {},
        content: [
          { type: 'Nested', props: { id: 'nested', layout: { body: simple().data.content } } },
        ],
      },
    };
    expect(resolveDocument(document, nestedRegistry).ok).toBe(true);
    expect(
      code(
        resolveDocument(
          {
            ...document,
            variables: { value: {} },
            bindings: [{ nodeId: 'nested', targetPath: ['layout'], sourcePath: ['value'] }],
          },
          nestedRegistry
        )
      )
    ).toBe('slot-binding-target');
  });

  it('accepts text or objects, optional variables/bindings, root props and Puck readOnly metadata', () => {
    const document = simple();
    expect(unwrap(parseDocument(JSON.stringify(document), registry))).toEqual(document);
    expect(
      unwrap(
        parseDocument(
          {
            ...document,
            data: {
              ...document.data,
              content: [{ ...document.data.content[0], readOnly: { text: true } }],
            },
          },
          registry
        )
      ).data.content[0]?.readOnly
    ).toEqual({ text: true });
  });

  it('checks shape before final props so bound placeholders are accepted', () => {
    expect(parseDocument(fixture(), registry).ok).toBe(true);
    expect(code(validateResolvedData(fixture().data, registry))).toBe('invalid-props');
    expect(resolveDocument(fixture(), registry).ok).toBe(true);
  });

  it.each([
    ['{', 'invalid-json'],
    [null, 'invalid-shape'],
    [{ ...simple(), schemaVersion: 99 }, 'unsupported-version'],
    [{ ...simple(), revision: 0 }, 'invalid-revision'],
    [{ ...simple(), revision: 1.5 }, 'invalid-revision'],
    [{ ...simple(), revision: Number.MAX_SAFE_INTEGER + 1 }, 'invalid-revision'],
    [{ ...simple(), locale: '' }, 'invalid-shape'],
    [{ ...simple(), custom: true }, 'unknown-property'],
    [{ ...simple(), data: { ...simple().data, zones: {} } }, 'unknown-property'],
    [
      { ...simple(), data: { root: {}, content: [{ type: 'Heading', props: { text: 'x' } }] } },
      'invalid-node-id',
    ],
    [
      { ...simple(), data: { root: {}, content: [{ type: 'Heading', props: { id: 'root' } }] } },
      'reserved-node-id',
    ],
  ])('rejects invalid envelope/structure %#', (input, expected) => {
    expect(code(parseDocument(input, registry))).toBe(expected);
  });

  it.each(['Unknown', 'toString', 'constructor'])('rejects unregistered type %s', (type) => {
    const document = {
      ...simple(),
      data: { root: {}, content: [{ type, props: { id: 'unknown' } }] },
    };
    const result = parseDocument(document, registry);
    expect(code(result)).toBe('unknown-node');
    if (!result.ok)
      expect(result.errors[0]).toMatchObject({
        documentId: 'static',
        nodeId: 'unknown',
        path: ['data', 'content', '0', 'type'],
      });
  });

  it('checks IDs across all nested slots but ignores business arrays', () => {
    const document = fixture();
    expect(unwrap(resolveDocument(document, registry)).metadata.nodeCount).toBe(4);
    const duplicate = {
      ...document,
      data: {
        ...document.data,
        content: [
          ...document.data.content,
          { type: 'Heading', props: { id: 'title', text: 'Duplicate', level: 2 } },
        ],
      },
    };
    expect(code(parseDocument(duplicate, registry))).toBe('duplicate-node-id');
  });

  it('rejects malformed and disallowed slot children before render', () => {
    const document = (content: unknown) => ({
      ...simple(),
      data: { root: {}, content: [{ type: 'Layout', props: { id: 'layout', content } }] },
    });
    expect(code(parseDocument(document({}), registry))).toBe('invalid-slot');
    const restricted = {
      ...registry,
      nodes: {
        ...registry.nodes,
        Layout: {
          validateProps: () => [],
          isBindingTarget: () => false,
          slots: [{ path: ['content'], allowedTypes: ['Heading'] }],
        },
      },
    };
    expect(
      code(
        parseDocument(
          document([{ type: 'Layout', props: { id: 'nested', content: [] } }]),
          restricted
        )
      )
    ).toBe('disallowed-slot-node');
  });

  it('checks final root and node props using the supplied contract', () => {
    expect(code(resolveDocument(simple({ text: 'x', level: 99 }), registry))).toBe('invalid-props');
    expect(
      code(resolveDocument(simple({ text: 'x', level: 2, style: { color: 'red' } }), registry))
    ).toBe('invalid-props');
    expect(
      code(
        resolveDocument(
          {
            ...simple(),
            data: { ...simple().data, root: { props: { title: 'Unknown root prop' } } },
          },
          registry
        )
      )
    ).toBe('invalid-props');
    const withRoot = { ...registry, validateRootProps: () => [] };
    expect(
      resolveDocument(
        { ...simple(), data: { ...simple().data, root: { props: { title: 'Page' } } } },
        withRoot
      ).ok
    ).toBe(true);
  });
});

describe('resolved cross-node validation', () => {
  it('runs after binding resolution, with data-relative error paths and document identity', () => {
    const checkedRegistry = {
      ...registry,
      validateData: (data: import('@frontend/ui-document').ContentData) =>
        data.content[0]?.props.text === 'Accepted'
          ? []
          : [{ path: ['content', '0', 'props', 'text'], message: 'Not accepted.' }],
    };
    const input = simple();
    const accepted = { ...input, variables: { page: { title: 'Accepted' } } };
    // Use a direct binding so this test does not rely on fixture namespace details.
    const bound = {
      ...accepted,
      bindings: [
        {
          nodeId: input.data.content[0]?.props.id,
          targetPath: ['text'],
          sourcePath: ['page', 'title'],
        },
      ],
    };
    expect(resolveDocument(bound, checkedRegistry).ok).toBe(true);
    const rejected = resolveDocument(
      { ...bound, variables: { page: { title: 'Other' } } },
      checkedRegistry
    );
    expect(rejected.ok).toBe(false);
    if (!rejected.ok)
      expect(rejected.errors[0]).toMatchObject({
        code: 'invalid-data',
        documentId: input.documentId,
        path: ['data', 'content', '0', 'props', 'text'],
      });
    expect(validateResolvedData(simple().data, checkedRegistry).ok).toBe(false);
  });
});
