import { describe, it, expect } from 'vitest';
import { greet } from '@frontend/template';
import { makeOptions } from '../test/fixtures.js';

describe('built package consumption', () => {
  it('exposes the library through its public ESM entry', () => {
    const options = makeOptions({ name: 'integration' });
    expect(greet(options)).toBe('Hello from integration!');
  });
});
