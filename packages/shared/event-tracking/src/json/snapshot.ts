import type { JsonObject, JsonValue } from '../contracts.js';

// Copy only JSON data properties; never invoke getters or toJSON.
function copy(value: unknown, ancestors: Set<object>): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object' || value === null || ancestors.has(value))
    throw new Error('Invalid JSON');
  const array = Array.isArray(value);
  if (
    !array &&
    Object.getPrototypeOf(value) !== Object.prototype &&
    Object.getPrototypeOf(value) !== null
  )
    throw new Error('Expected a plain JSON object');
  ancestors.add(value);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    const entries: [string, JsonValue][] = [];
    for (const key of keys) {
      if (array && key === 'length') continue;
      const property = typeof key === 'string' ? descriptors[key] : undefined;
      if (!property || !property.enumerable || !('value' in property))
        throw new Error('Invalid JSON property');
      if (array && !/^(0|[1-9][0-9]*)$/.test(String(key)))
        throw new Error('Invalid array property');
      entries.push([String(key), copy(property.value, ancestors)]);
    }
    if (array) {
      if (entries.length !== value.length) throw new Error('Sparse arrays are not JSON data');
      return Object.freeze(entries.map(([, item]) => item));
    }
    return Object.freeze(Object.fromEntries(entries));
  } finally {
    ancestors.delete(value);
  }
}
export function snapshotJsonObject(input: unknown): JsonObject {
  if (input === null || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Expected JSON object');
  return copy(input, new Set()) as JsonObject;
}
