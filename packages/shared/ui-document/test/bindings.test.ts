import { describe, expect, it } from 'vitest';
import { resolveDocument } from '@frontend/ui-document';
import type { ContentBinding } from '@frontend/ui-document';
import { fixture, freezeDeep, registry, findProps } from './fixtures.js';
import { unwrap, code, withBindings } from './helpers.js';

describe('explicit bindings', () => {
  it('resolves nested slots without changing the original envelope or context', () => {
    const input = fixture();
    const context = { request: { count: 3 } };
    const before = JSON.stringify(input);
    freezeDeep(input);
    freezeDeep(context);
    const first = unwrap(resolveDocument(input, registry, { context }));
    const second = unwrap(resolveDocument(input, registry, { context }));
    expect(first).toEqual(second);
    expect(JSON.stringify(input)).toBe(before);
    expect(first.document).toEqual(input);
    expect(JSON.stringify(first.data)).toContain('"text":"Sample article"');
    expect(first.document.bindings).toEqual(input.bindings);
    expect(JSON.stringify(first.document.data)).toContain('"text":""');
  });

  it('binds ordinary arrays, nested array fields and nullable props', () => {
    const result = unwrap(
      resolveDocument(
        withBindings([
          ...(fixture().bindings ?? []),
          {
            nodeId: 'media',
            targetPath: ['images', '0', 'alt'],
            sourcePath: ['content', 'images', '0', 'alt'],
          },
          { nodeId: 'media', targetPath: ['caption'], sourcePath: ['request', 'caption'] },
        ]),
        registry,
        { context: { request: { caption: null } } }
      )
    );
    expect(JSON.stringify(result.data)).toContain('An image beside a short paragraph');
    expect(JSON.stringify(result.data)).toContain('"caption":null');
    const arrays = unwrap(
      resolveDocument(
        withBindings([
          ...(fixture().bindings ?? []),
          { nodeId: 'media', targetPath: ['images'], sourcePath: ['content', 'images'] },
        ]),
        registry
      )
    );
    expect(JSON.stringify(arrays.data)).toContain('An image beside a short paragraph');
  });

  it('copies bound object values rather than aliasing variables or repeated destinations', () => {
    const document = withBindings([
      ...(fixture().bindings ?? []),
      { nodeId: 'media', targetPath: ['images'], sourcePath: ['content', 'images'] },
      { nodeId: 'second-media', targetPath: ['images'], sourcePath: ['content', 'images'] },
    ]);
    const input = {
      ...document,
      data: {
        ...document.data,
        content: [
          ...document.data.content,
          { type: 'Media', props: { id: 'second-media', images: [], caption: null } },
        ],
      },
    };
    const before = JSON.stringify(input);
    const result = unwrap(resolveDocument(input, registry));
    const first = findProps(result.data, 'media').images;
    const second = findProps(result.data, 'second-media').images;
    expect(first).not.toBe(second);
    if (first === null || typeof first !== 'object') throw new Error('Missing images.');
    Object.defineProperty(first, '0', { value: { alt: 'Mutated by consumer' } });
    expect(JSON.stringify(second)).toContain('An image beside a short paragraph');
    expect(JSON.stringify(result.document.variables)).toContain(
      'An image beside a short paragraph'
    );
    expect(JSON.stringify(input)).toBe(before);
    expect(result.data).not.toBe(result.document.data);
    expect(JSON.stringify(input.data)).toContain('Original');
  });

  it('does not interpolate strings or recursively interpret variable values', () => {
    const document = { ...fixture(), variables: { content: { title: '${request.secret}' } } };
    expect(JSON.stringify(unwrap(resolveDocument(document, registry)).data)).toContain(
      '${request.secret}'
    );
  });

  it.each([
    [
      { nodeId: 'missing', targetPath: ['text'], sourcePath: ['content', 'title'] },
      'missing-binding-node',
    ],
    [
      { nodeId: 'title', targetPath: ['id'], sourcePath: ['content', 'title'] },
      'reserved-binding-target',
    ],
    [
      { nodeId: 'title', targetPath: ['puck'], sourcePath: ['content', 'title'] },
      'reserved-binding-target',
    ],
    [
      { nodeId: 'title', targetPath: ['unregistered'], sourcePath: ['content', 'title'] },
      'invalid-binding-target',
    ],
    [
      { nodeId: 'outer', targetPath: ['content'], sourcePath: ['content', 'images'] },
      'slot-binding-target',
    ],
    [
      {
        nodeId: 'outer',
        targetPath: ['content', '0', 'props', 'id'],
        sourcePath: ['content', 'title'],
      },
      'slot-binding-target',
    ],
    [{ nodeId: 'title', targetPath: ['text'], sourcePath: ['absent'] }, 'missing-variable'],
    [
      { nodeId: 'title', targetPath: ['text'], sourcePath: ['content', 'toString'] },
      'missing-variable',
    ],
    [
      { nodeId: 'title', targetPath: ['text'], sourcePath: ['content', 'images', '01'] },
      'missing-variable',
    ],
    [
      { nodeId: 'title', targetPath: ['text'], sourcePath: ['content', 'images', 'length'] },
      'missing-variable',
    ],
    [
      { nodeId: 'media', targetPath: ['images', '1', 'alt'], sourcePath: ['content', 'title'] },
      'invalid-target',
    ],
    [
      { nodeId: 'media', targetPath: ['images', '-1'], sourcePath: ['content', 'title'] },
      'invalid-target',
    ],
  ] satisfies readonly (readonly [ContentBinding, string])[])(
    'rejects invalid binding %#',
    (binding, expected) => {
      expect(code(resolveDocument(withBindings([binding]), registry))).toBe(expected);
    }
  );

  it.each(['__proto__', 'constructor', 'prototype'])(
    'rejects dangerous segments in both paths: %s',
    (segment) => {
      const binding: ContentBinding = {
        nodeId: 'title',
        targetPath: ['text'],
        sourcePath: ['content', segment],
      };
      expect(code(resolveDocument(withBindings([binding]), registry))).toBe('unsafe-path');
      expect(
        code(
          resolveDocument(withBindings([{ ...binding, targetPath: ['images', segment] }]), registry)
        )
      ).toBe('unsafe-path');
    }
  );

  it('rejects overlapping targets independent of their order', () => {
    const parent: ContentBinding = {
      nodeId: 'media',
      targetPath: ['images'],
      sourcePath: ['content', 'images'],
    };
    const child: ContentBinding = {
      ...parent,
      targetPath: ['images', '0', 'alt'],
      sourcePath: ['content', 'title'],
    };
    for (const bindings of [
      [parent, child],
      [child, parent],
      [child, child],
    ])
      expect(code(resolveDocument(withBindings(bindings), registry))).toBe('overlapping-binding');
  });

  it('rejects conflicting namespaces and final type errors without coercion', () => {
    expect(code(resolveDocument(fixture(), registry, { context: null }))).toBe('invalid-shape');
    expect(
      code(resolveDocument(fixture(), registry, { context: { content: { title: 'Override' } } }))
    ).toBe('context-conflict');
    for (const title of [null, 12, false, {}, []])
      expect(
        code(resolveDocument({ ...fixture(), variables: { content: { title } } }, registry))
      ).toBe('invalid-props');
  });
});
