import { describe, expect, it } from 'vitest';
import { parseDocument, resolveDocument } from '@frontend/ui-document';
import type { ContentBinding } from '@frontend/ui-document';
import { fixture, registry } from './fixtures.js';
import { unwrap, code, simple, withBindings } from './helpers.js';

describe('JSON and resource boundaries', () => {
  it('applies the final size limit independently of binding order', () => {
    const expand: ContentBinding = {
      nodeId: 'media',
      targetPath: ['images', '0', 'alt'],
      sourcePath: ['request', 'long'],
    };
    const shrink: ContentBinding = {
      nodeId: 'media',
      targetPath: ['caption'],
      sourcePath: ['request', 'short'],
    };
    const document = {
      documentId: 'budget',
      schemaVersion: 1,
      revision: 1,
      data: {
        root: {},
        content: [
          {
            type: 'Media',
            props: { id: 'media', images: [{ alt: '' }], caption: 'x'.repeat(1000) },
          },
        ],
      },
    };
    const options = {
      context: { request: { long: 'y'.repeat(1000), short: '' } },
      limits: { maxBytes: 1800 },
    };
    const first = unwrap(
      resolveDocument({ ...document, bindings: [expand, shrink] }, registry, options)
    );
    const second = unwrap(
      resolveDocument({ ...document, bindings: [shrink, expand] }, registry, options)
    );
    expect(first.data).toEqual(second.data);
  });

  it.each([
    undefined,
    () => 'value',
    1n,
    Number.NaN,
    Infinity,
    new Date(),
    new Map(),
    new Set(),
    new Uint8Array(2),
  ])('rejects non-JSON object values %#', (value) => {
    expect(code(parseDocument({ ...simple(), variables: { value } }, registry))).toBe(
      'non-json-value'
    );
  });

  it('rejects cycles, sparse/named arrays and getters without executing them', () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(code(parseDocument({ ...simple(), variables: cycle }, registry))).toBe('circular-json');
    const sparse = new Array<unknown>(2);
    expect(code(parseDocument({ ...simple(), variables: { sparse } }, registry))).toBe(
      'non-json-value'
    );
    const named = Object.assign([1], { extra: true });
    expect(code(parseDocument({ ...simple(), variables: { named } }, registry))).toBe(
      'non-json-value'
    );
    let called = false;
    const getter = Object.defineProperty({}, 'secret', {
      enumerable: true,
      get() {
        called = true;
        return 1;
      },
    });
    expect(code(parseDocument({ ...simple(), variables: getter }, registry))).toBe(
      'non-json-value'
    );
    expect(called).toBe(false);
    expect(
      code(parseDocument({ ...simple(), variables: { [Symbol('hidden')]: 1 } }, registry))
    ).toBe('non-json-value');
    const hidden = Object.defineProperty({}, 'hidden', { value: true });
    expect(code(parseDocument({ ...simple(), variables: hidden }, registry))).toBe(
      'non-json-value'
    );
  });

  it('accepts shared but acyclic input and preserves dangerous-looking data keys safely', () => {
    const shared = { text: 'Data' };
    const document: unknown = JSON.parse(
      JSON.stringify({ ...simple(), variables: { a: shared, b: shared } })
    );
    expect(parseDocument(document, registry).ok).toBe(true);
    const result = unwrap(
      parseDocument(
        JSON.stringify({
          ...simple(),
          variables: JSON.parse('{"__proto__":{"polluted":true}}') as unknown,
        }),
        registry
      )
    );
    expect(Object.hasOwn(result.variables ?? {}, '__proto__')).toBe(true);
    expect(Object.hasOwn({}, 'polluted')).toBe(false);
  });

  it('enforces configured size, tree, value, binding and path limits', () => {
    expect(code(parseDocument(fixture(), registry, { limits: { maxBytes: 20 } }))).toBe(
      'document-too-large'
    );
    expect(code(parseDocument(fixture(), registry, { limits: { maxValues: 5 } }))).toBe(
      'too-many-values'
    );
    expect(code(parseDocument(fixture(), registry, { limits: { maxJsonDepth: 3 } }))).toBe(
      'json-too-deep'
    );
    expect(code(parseDocument(fixture(), registry, { limits: { maxNodes: 3 } }))).toBe(
      'too-many-nodes'
    );
    expect(code(parseDocument(fixture(), registry, { limits: { maxNodeDepth: 2 } }))).toBe(
      'nodes-too-deep'
    );
    expect(code(parseDocument(fixture(), registry, { limits: { maxPathSegments: 1 } }))).toBe(
      'path-too-long'
    );
    expect(
      code(
        parseDocument(
          withBindings([...(fixture().bindings ?? []), ...(fixture().bindings ?? [])]),
          registry,
          { limits: { maxBindings: 1 } }
        )
      )
    ).toBe('too-many-bindings');
    expect(() => parseDocument(fixture(), registry, { limits: { maxBytes: -1 } })).toThrow(
      RangeError
    );
    expect(() => parseDocument(fixture(), registry, { limits: { maxJsonDepth: 10_000 } })).toThrow(
      RangeError
    );
  });

  it('checks UTF-8 bytes for both input forms and expanded output', () => {
    const document = simple({ text: '汉'.repeat(200), level: 2 });
    for (const input of [document, JSON.stringify(document)])
      expect(code(parseDocument(input, registry, { limits: { maxBytes: 500 } }))).toBe(
        'document-too-large'
      );
    const source = { request: { title: 'x'.repeat(1000) } };
    expect(
      code(
        resolveDocument(
          {
            ...fixture(),
            bindings: [{ nodeId: 'title', targetPath: ['text'], sourcePath: ['request', 'title'] }],
          },
          registry,
          { context: source, limits: { maxBytes: 1100 } }
        )
      )
    ).toBe('document-too-large');
  });
});
