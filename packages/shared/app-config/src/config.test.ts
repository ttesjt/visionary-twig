import { expect, it } from 'vitest';
import { z } from 'zod';
import { createAppConfigReader } from './index.js';
it('validates app-owned schemas and provides the same language-independent value', () => {
  const schema = z.strictObject({ mode: z.enum(['text', 'image']) });
  const reader = createAppConfigReader(schema, { mode: 'text' });
  expect(reader.get()).toEqual({ mode: 'text' });
  expect(reader.get()).toBe(reader.get());
  expect(Object.isFrozen(reader.get())).toBe(true);
  expect(() => createAppConfigReader(schema, { mode: 'bad' })).toThrow();
  expect(() => createAppConfigReader(schema, { mode: 'text', secret: 'not allowed' })).toThrow();
});

it('deeply freezes children of shallow-readonly schemas for every subsequent read', () => {
  const schema = z
    .strictObject({
      appearance: z.strictObject({ nested: z.strictObject({ label: z.string() }) }).readonly(),
      links: z.array(z.strictObject({ label: z.string() })).readonly(),
    })
    .readonly();
  const reader = createAppConfigReader(schema, {
    appearance: { nested: { label: 'Original' } },
    links: [{ label: 'Original link' }],
  });
  const value = reader.get();
  expect(() => {
    value.appearance.nested.label = 'Changed';
  }).toThrow(TypeError);
  const [item] = value.links;
  if (!item) throw new Error('Expected a nested item.');
  expect(() => {
    item.label = 'Changed';
  }).toThrow(TypeError);
  expect(reader.get().appearance.nested.label).toBe('Original');
  expect(reader.get().links[0]?.label).toBe('Original link');
});
