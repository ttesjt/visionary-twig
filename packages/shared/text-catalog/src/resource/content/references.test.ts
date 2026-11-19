import { expect, it } from 'vitest';
import { z } from 'zod';
import { validateContentTextReferences } from '../content.js';

const schema = z.unknown().superRefine(validateContentTextReferences);
it('validates nested markers without resolving, mutating or rejecting literal content', () => {
  const value = {
    pages: [{ title: { $text: { namespace: 'page', key: 'title' } }, body: 'Literal' }],
  };
  expect(schema.parse(value)).toBe(value);
  const result = schema.safeParse({
    pages: [{ title: { $text: { namespace: '', key: 'title' } } }],
  });
  expect(result.success).toBe(false);
  if (!result.success)
    expect(result.error.issues[0]?.path).toEqual(['pages', 0, 'title', '$text', 'namespace']);
  expect(
    schema.safeParse({ $text: { namespace: 'main', key: 'title' }, extra: true }).success
  ).toBe(false);
});
