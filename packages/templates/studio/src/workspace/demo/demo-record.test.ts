import { expect, it } from 'vitest';
import { demoRecordSchema, DEMO_TITLE_MAX_LENGTH } from './demo-record';
const record = { id: 'created-record', title: 'Record', summary: '', status: 'draft' };
it('accepts generated identities independently of the three seed records and permits no image', () => {
  expect(demoRecordSchema.parse(record)).toEqual(record);
});
it('rejects invalid identities, statuses, empty titles and overlong fields', () => {
  for (const patch of [
    { id: 'bad/id' },
    { status: 'published' },
    { title: ' ' },
    { title: 'a'.repeat(DEMO_TITLE_MAX_LENGTH + 1) },
  ]) {
    expect(demoRecordSchema.safeParse({ ...record, ...patch }).success).toBe(false);
  }
});
it('validates optional image references and rejects executable schemes', () => {
  for (const imageUrl of [
    'https://images.example.test/cover.png',
    '/samples/media/rings.svg',
    'blob:http://localhost/image',
  ]) {
    expect(demoRecordSchema.safeParse({ ...record, imageUrl }).success).toBe(true);
  }
  expect(demoRecordSchema.safeParse({ ...record, imageUrl: 'javascript:alert(1)' }).success).toBe(
    false
  );
});
