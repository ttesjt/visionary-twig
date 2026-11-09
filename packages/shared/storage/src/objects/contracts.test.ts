import { expect, it } from 'vitest';
import { assertObjectKey, assertObjectSize, MAX_STORED_OBJECT_BYTES } from './contracts.js';
it('rejects traversal, encoded separators, empty segments and unbounded objects', () => {
  for (const key of ['../secret', 'images/../secret', 'images//a', '/absolute', 'x%2fy', ''])
    expect(() => assertObjectKey(key)).toThrow();
  expect(() => assertObjectKey('media/abc-123.png')).not.toThrow();
  for (const size of [0, -1, 1.5, MAX_STORED_OBJECT_BYTES + 1])
    expect(() => assertObjectSize(size)).toThrow();
});
