export const RESOURCE_SNAPSHOT_VERSION = 1;
export const DEFAULT_RESOURCE_TIMEOUT_MS = 10_000;
export const DEFAULT_RESOURCE_CONCURRENCY = 6;
export const DEFAULT_MAX_PENDING_RESOURCES = 1024;
export const DEFAULT_MAX_PLAN_RESOURCES = 512;
export const DEFAULT_CACHE_INACTIVE_ENTRIES = 64;
export const DEFAULT_MAX_RESOURCE_BYTES = 262_144;
export function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new RangeError(`${name} must be a positive integer.`);
  return value;
}
