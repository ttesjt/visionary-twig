import type { z } from 'zod';
import { assertSafeData } from '../index.js';

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function sameJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left))
    return (
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value: unknown, index) => sameJson(value, right[index]))
    );
  if (!object(left) || !object(right)) return false;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => Object.hasOwn(right, key) && sameJson(left[key], right[key]))
  );
}
/** Artifact validation must not normalize/convert already prepared values.
 * Source conversion belongs to sourceSchema in Node preparation.
 */
export function validateJsonArtifact(schema: z.ZodType, input: unknown): unknown {
  assertSafeData(input);
  const parsed: unknown = schema.parse(structuredClone(input));
  assertSafeData(parsed);
  if (!sameJson(input, parsed))
    throw new Error('Artifact schema changed prepared data; put conversions in sourceSchema.');
  return structuredClone(parsed);
}
