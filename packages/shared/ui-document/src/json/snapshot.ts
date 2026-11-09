import { fail } from '../document/errors.js';
import type { ContentLimits } from '../document/limits.js';

export type JsonValue = null | boolean | number | string | JsonObject | readonly JsonValue[];
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export function isJsonArray(value: JsonValue | undefined): value is readonly JsonValue[] {
  return Array.isArray(value);
}

export function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return (
    value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
  );
}

/** Creates an owned JSON snapshot without executing getters, toJSON, or coercion. */
export function snapshotJson(input: unknown, limits: ContentLimits): JsonValue {
  return snapshotWithSize(input, limits).value;
}

export function snapshotWithSize(
  input: unknown,
  limits: ContentLimits
): { readonly value: JsonValue; readonly bytes: number; readonly values: number } {
  let bytes = 0;
  let values = 0;
  const ancestors = new WeakSet<object>();
  const encoder = new TextEncoder();

  function countBytes(count: number, path: readonly string[]): void {
    bytes += count;
    if (bytes > limits.maxBytes) fail('document-too-large', path, 'JSON exceeds maxBytes.');
  }

  function countString(value: string, path: readonly string[]): void {
    if (value.length > limits.maxBytes)
      fail('document-too-large', path, 'String exceeds maxBytes.');
    countBytes(encoder.encode(JSON.stringify(value)).byteLength, path);
  }

  function visit(value: unknown, path: readonly string[], depth: number): JsonValue {
    if (++values > limits.maxValues) fail('too-many-values', path, 'JSON exceeds maxValues.');
    if (depth > limits.maxJsonDepth) fail('json-too-deep', path, 'JSON exceeds maxJsonDepth.');
    if (typeof value === 'string') {
      countString(value, path);
      return value;
    }
    if (value === null || typeof value === 'boolean' || typeof value === 'number') {
      if (typeof value === 'number' && !Number.isFinite(value)) {
        fail('non-json-value', path, 'JSON numbers must be finite.');
      }
      countBytes(String(value).length, path);
      return value;
    }
    if (typeof value !== 'object') fail('non-json-value', path, 'Expected a JSON value.');
    if (ancestors.has(value)) fail('circular-json', path, 'Circular references are not JSON.');
    const array = Array.isArray(value);
    const prototype: unknown = Object.getPrototypeOf(value);
    if (
      prototype !== (array ? Array.prototype : Object.prototype) &&
      !(prototype === null && !array)
    ) {
      fail('non-json-value', path, 'Only plain objects and arrays are supported.');
    }
    ancestors.add(value);
    const keys = Reflect.ownKeys(value);
    if (keys.length > limits.maxValues) fail('too-many-values', path, 'Object exceeds maxValues.');
    countBytes(2, path);
    const result: Record<string, JsonValue> = {};
    const items: JsonValue[] = [];
    if (array && value.length > limits.maxValues) {
      fail('too-many-values', path, 'Array exceeds maxValues.');
    }
    let count = 0;
    for (const key of keys) {
      if (array && key === 'length') continue;
      if (typeof key !== 'string') fail('non-json-value', path, 'Symbol keys are not JSON.');
      const nextPath = [...path, key];
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
        fail('non-json-value', nextPath, 'Accessors and hidden properties are not supported.');
      }
      if (count++ > 0) countBytes(1, path);
      if (!array) {
        countString(key, nextPath);
        countBytes(1, nextPath);
      } else if (key !== String(items.length)) {
        fail('non-json-value', nextPath, 'Arrays must be dense and have no named properties.');
      }
      const property: unknown = descriptor.value;
      const copy = visit(property, nextPath, depth + 1);
      if (array) items.push(copy);
      else
        Object.defineProperty(result, key, {
          value: copy,
          enumerable: true,
          writable: true,
          configurable: true,
        });
    }
    if (array && items.length !== value.length)
      fail('non-json-value', path, 'Sparse arrays are not JSON.');
    ancestors.delete(value);
    return array ? items : result;
  }

  const value = visit(input, [], 0);
  return { value, bytes, values };
}
