import { fail } from '../document/errors.js';
import { isJsonObject } from './snapshot.js';
import type { JsonObject, JsonValue } from './snapshot.js';

export function objectAt(value: JsonValue | undefined, path: readonly string[]): JsonObject {
  if (!isJsonObject(value)) fail('invalid-shape', path, 'Expected an object.');
  return value;
}

export function stringAt(value: JsonValue | undefined, path: readonly string[]): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail('invalid-shape', path, 'Expected a non-empty string.');
  }
  return value;
}

export function onlyKeys(
  object: JsonObject,
  allowed: readonly string[],
  path: readonly string[]
): void {
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) fail('unknown-property', [...path, key], 'Unknown property.');
  }
}

export function readOnlyAt(
  value: JsonValue | undefined,
  path: readonly string[]
): Readonly<Record<string, boolean>> | undefined {
  if (value === undefined) return undefined;
  const object = objectAt(value, path);
  const flags: Record<string, boolean> = {};
  for (const [key, flag] of Object.entries(object)) {
    if (typeof flag !== 'boolean') fail('invalid-shape', [...path, key], 'Expected a boolean.');
    Object.defineProperty(flags, key, { value: flag, enumerable: true });
  }
  return flags;
}
