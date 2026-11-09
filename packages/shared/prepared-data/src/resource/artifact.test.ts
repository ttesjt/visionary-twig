import { it, expect } from 'vitest';
import { z } from 'zod';
import { JsonResource, validateJsonArtifact } from './index.js';

it('validates artifacts without changing their JSON values or depending on object key order', () => {
  const schema = z.object({ b: z.number(), a: z.string().trim() });
  expect(validateJsonArtifact(schema, { a: 'ready', b: 1 })).toEqual({ a: 'ready', b: 1 });
  expect(() => validateJsonArtifact(schema, { a: ' unprepared ', b: 1 })).toThrow(
    /Artifact schema changed/
  );
  expect(() => validateJsonArtifact(schema, { a: 'ready', b: '1' })).toThrow();
  expect(() => validateJsonArtifact(schema, { a: 'ready', b: 1, extra: true })).toThrow(
    /Artifact schema changed/
  );
});
it('rejects a conversion used as an artifact schema instead of accumulating edits', () => {
  const schema = z.string().transform((value) => value + '!');
  expect(() => validateJsonArtifact(schema, 'ready!')).toThrow(/sourceSchema/);
  expect(
    () =>
      new JsonResource({ label: schema }, [{ namespace: 'label', version: '1', value: 'ready!' }])
  ).toThrow(/sourceSchema/);
});
it('freezes owned artifact values without retaining caller references', () => {
  const schema = z.object({ items: z.array(z.object({ title: z.string() })) }).readonly();
  const original = { items: [{ title: 'Ready' }] };
  const reader = new JsonResource({ record: schema }, [
    { namespace: 'record', version: '1', value: original },
  ]).createView();
  const first = original.items[0];
  if (!first) throw new Error('Missing fixture item');
  first.title = 'Changed';
  expect(reader.get('record').items[0]?.title).toBe('Ready');
  expect(Object.isFrozen(reader.get('record').items[0])).toBe(true);
});

it('owns schema outputs even when a validator returns an existing equal object', () => {
  const external = { items: ['Ready'] };
  const schema = z.unknown().transform(() => external);
  const reader = new JsonResource({ entry: schema }, [
    { namespace: 'entry', version: '1', value: { items: ['Ready'] } },
  ]).createView();
  external.items.push('Changed');
  expect(reader.get('entry').items).toEqual(['Ready']);
  expect(Object.isFrozen(external.items)).toBe(false);
});
