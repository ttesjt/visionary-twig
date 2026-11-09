import { fail } from '../document/errors.js';
import type { JsonObject, JsonValue } from '../json/snapshot.js';
import { isJsonArray, isJsonObject } from '../json/snapshot.js';

const DANGEROUS_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);
const RESERVED_PROPS = new Set(['id', 'type', 'puck', 'readOnly']);

export function assertSafePath(path: readonly string[], location: readonly string[]): void {
  if (path.length === 0) fail('invalid-path', location, 'Paths must not be empty.');
  if (path.some((part) => part.length === 0 || DANGEROUS_SEGMENTS.has(part))) {
    fail('unsafe-path', location, 'Empty or dangerous path segment.');
  }
}

export function isReservedTarget(path: readonly string[]): boolean {
  return path[0] === undefined || RESERVED_PROPS.has(path[0]);
}

export function isPrefix(prefix: readonly string[], path: readonly string[]): boolean {
  return prefix.length <= path.length && prefix.every((part, index) => part === path[index]);
}

function ownValue(value: JsonValue, key: string): JsonValue | undefined {
  if (isJsonArray(value)) {
    if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length) return undefined;
    return value[Number(key)];
  }
  return isJsonObject(value) && Object.hasOwn(value, key) ? value[key] : undefined;
}

export function readPath(value: JsonValue, path: readonly string[]): JsonValue | undefined {
  let current: JsonValue | undefined = value;
  for (const key of path) {
    if (current === undefined) return undefined;
    current = ownValue(current, key);
  }
  return current;
}

/** Only final object keys may be absent; arrays and intermediate containers must exist. */
export function writePath(props: JsonObject, path: readonly string[], value: JsonValue): void {
  const parent = readPath(props, path.slice(0, -1));
  const key = path.at(-1);
  if (parent === undefined || parent === null || typeof parent !== 'object' || key === undefined) {
    fail('invalid-target', path, 'Binding target requires an existing parent object.');
  }
  if (Array.isArray(parent) && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= parent.length)) {
    fail('invalid-target', path, 'Binding array index must be canonical and in bounds.');
  }
  Object.defineProperty(parent, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}
