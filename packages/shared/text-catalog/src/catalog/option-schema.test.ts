import { expect, it, expectTypeOf } from 'vitest';
import { textOptionLabelsSchema, textOptionLabel } from './option-schema.js';
it('requires a label for every controlled ID without accepting unknown IDs', () => {
  const schema = textOptionLabelsSchema([1, 2]);
  expect(schema.parse({ '1': 'Single', '2': 'Double' })).toEqual({ '1': 'Single', '2': 'Double' });
  for (const value of [
    { '1': 'Single' },
    { '1': 'Single', '2': 'Double', '3': 'Other' },
    { '1': 'Single', '2': '' },
  ])
    expect(schema.safeParse(value).success).toBe(false);
  for (const values of [[], [''], [1, '1']])
    expect(() => textOptionLabelsSchema(values)).toThrow('distinct');
});
it('retains exhaustive ID types for consumers without undefined label fallbacks', () => {
  const schema = textOptionLabelsSchema(['light', 'dark']);
  const labels = schema.parse({ light: 'Day', dark: 'Night' });
  expectTypeOf(labels.light).toEqualTypeOf<string>();
  // @ts-expect-error Only the declared IDs are present in the inferred dictionary.
  expectTypeOf(labels.system).toBeAny();
});

it('does not silently display an unknown runtime option ID', () => {
  expect(textOptionLabel({ light: 'Day' }, 'light')).toBe('Day');
  expect(() => textOptionLabel({ light: 'Day' }, 'night')).toThrow('Missing text option label');
});
