function dictionary(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
/** Reject non-JSON schema outputs as well as unsafe keys; error text never includes values. */
export function assertSafeData(value: unknown): void {
  const active = new WeakSet<object>();
  function visitArray(values: readonly unknown[]): void {
    for (const child of values) visit(child);
  }
  function visit(item: unknown): void {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return;
    if (typeof item === 'number' && Number.isFinite(item)) return;
    if (typeof item !== 'object')
      throw new Error('Prepared data must contain finite JSON values only.');
    if (active.has(item)) throw new Error('Prepared JSON cannot contain cycles.');
    active.add(item);
    if (Array.isArray(item)) visitArray(item);
    else {
      const prototype: unknown = Object.getPrototypeOf(item);
      if (prototype !== null && prototype !== Object.prototype)
        throw new Error('Prepared JSON requires plain objects.');
      if (dictionary(item))
        for (const [key, child] of Object.entries(item)) {
          if (FORBIDDEN_KEYS.has(key)) throw new Error('Forbidden prepared-data key: ' + key);
          visit(child);
        }
    }
    active.delete(item);
  }
  visit(value);
}
function mergeValidated(defaults: unknown, overrides: unknown): unknown {
  if (!dictionary(overrides)) return overrides;
  const result: Record<string, unknown> = dictionary(defaults) ? { ...defaults } : {};
  for (const [key, value] of Object.entries(overrides))
    result[key] = mergeValidated(result[key], value);
  return result;
}
/** Objects merge recursively. Arrays/scalars replace; schema validation owns allowed keys. */
export function mergePreparedData(defaults: unknown, overrides: unknown): unknown {
  assertSafeData(defaults);
  assertSafeData(overrides);
  return mergeValidated(defaults, overrides);
}
/** Freeze owned parsed JSON recursively; readers expose immutable startup inputs. */
export function freezePreparedData(value: unknown): void {
  if (typeof value !== 'object' || value === null) return;
  if (Array.isArray(value)) value.forEach((child: unknown) => freezePreparedData(child));
  else if (dictionary(value)) for (const child of Object.values(value)) freezePreparedData(child);
  Object.freeze(value);
}
