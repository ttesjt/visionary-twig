import { expect, it } from 'vitest';
import { boundaryPosition } from './boundary-position.js';
import { scrollBoundaryPropsSchema } from './scroll-boundary.schema.js';

it('distinguishes below, within, passed and zero-length ranges at the reference line', () => {
  const position = (top: number, bottom: number) =>
    boundaryPosition({ top, bottom, line: 40, range: 'within' });
  expect(position(400, 600)).toBe('before');
  expect(position(40, 600)).toBe('active');
  expect(position(-400, 600)).toBe('active');
  expect(position(-400, 40)).toBe('after');
  expect(position(40, 40)).toBe('after');
  expect(boundaryPosition({ top: -400, bottom: -200, line: 40, range: 'past-start' })).toBe(
    'active'
  );
});
it('limits JSON to bounded behavior and finite nonnegative reference offsets', () => {
  expect(scrollBoundaryPropsSchema.safeParse({ range: 'within', offset: 48 }).success).toBe(true);
  for (const value of [
    { offset: -1 },
    { offset: Infinity },
    { offset: NaN },
    { range: 'sticky' },
    { target: '#header' },
    { onStateChange: 'execute()' },
    { style: {} },
  ]) {
    expect(scrollBoundaryPropsSchema.safeParse(value).success).toBe(false);
  }
});
