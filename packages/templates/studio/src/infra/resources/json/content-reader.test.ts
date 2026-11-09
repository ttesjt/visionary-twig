import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { z } from 'zod';
import { JsonResource } from '@frontend/prepared-data/resource';
import { contentTextReferenceSchema } from '../../content-text-reference';
import { createContentReader } from './content-reader';

const schemas = {
  catalog: z.strictObject({
    rows: z.array(z.tuple([z.union([z.string(), contentTextReferenceSchema]), z.number()])),
    published: z.boolean(),
    note: z.null(),
  }),
  heading: contentTextReferenceSchema,
  extra: z.unknown(),
};
const ref = { $text: { namespace: 'demo', key: 'work.title' } };
const data = {
  rows: [
    [ref, 1],
    ['demo.work.title', 2],
    ['{title}', 3],
  ],
  published: false,
  note: null,
};
function view(extra: unknown) {
  const parent = new JsonResource(schemas, [{ namespace: 'catalog', version: '1', value: data }]);
  return createContentReader(
    new JsonResource(schemas, [
      { namespace: 'heading', version: '1', value: ref },
      { namespace: 'extra', version: '1', value: extra },
    ]).createView(parent.createView())
  );
}

describe('resolved Content reader', () => {
  it('resolves only explicit references, including inherited data and root references, with the supplied reader', () => {
    const reader = view({ namespace: 'demo', key: 'work.title' });
    const text = { getText: vi.fn(() => 'Paper') };
    const raw = reader.get('catalog');
    expect(text.getText).not.toHaveBeenCalled();
    const resolved = reader.getResolved('catalog', { text });
    expectTypeOf(resolved.rows).toEqualTypeOf<readonly (readonly [string, number])[]>();
    expect(resolved).toEqual({
      ...data,
      rows: [
        ['Paper', 1],
        ['demo.work.title', 2],
        ['{title}', 3],
      ],
    });
    expect(Object.isFrozen(resolved.rows[0])).toBe(true);
    expect(reader.getResolved('heading', { text: { getText: () => '纸' } })).toBe('纸');
    expect(reader.getResolved('extra', { text })).toEqual({ namespace: 'demo', key: 'work.title' });
    expect(text.getText.mock.calls).toEqual([['demo', 'work.title']]);
    expect(reader.get('catalog')).toBe(raw);
    expect(raw.rows[0]?.[0]).toEqual(ref);
  });
  it('requires narrowing an optional reference before using object fields', () => {
    const optionalHeading = contentTextReferenceSchema
      .partial()
      .extend({ label: z.string().optional() });
    const schemas = { headings: z.array(optionalHeading), plain: z.record(z.string(), z.string()) };
    const reader = createContentReader(
      new JsonResource(schemas, [
        { namespace: 'headings', version: '1', value: [ref, { label: 'Draft' }, {}] },
        { namespace: 'plain', version: '1', value: { label: 'Literal' } },
      ]).createView()
    );
    const text = { getText: vi.fn(() => 'Paper') };
    const headings = reader.getResolved('headings', { text });
    expectTypeOf(headings).toEqualTypeOf<
      readonly (string | { readonly label?: string | undefined })[]
    >();
    expectTypeOf(reader.getResolved('plain', { text })).toEqualTypeOf<
      Readonly<Record<string, string>>
    >();
    expect(headings).toEqual(['Paper', { label: 'Draft' }, {}]);
    expect(text.getText).toHaveBeenCalledTimes(1);
    expect(reader.get('headings')[0]?.$text).toEqual(ref.$text);
  });
  it('reserves $text for complete references and propagates lookup failures', () => {
    const text = {
      getText: vi.fn(() => {
        throw new Error('Lookup failed');
      }),
    };
    for (const malformed of [
      { $text: 'title' },
      { ...ref, id: 1 },
      { $text: { namespace: '', key: 'title' } },
    ]) {
      expect(() => view(malformed).getResolved('extra', { text })).toThrow(z.ZodError);
    }
    expect(text.getText).not.toHaveBeenCalled();
    expect(() => view(null).getResolved('heading', { text })).toThrow('Lookup failed');
  });
});
