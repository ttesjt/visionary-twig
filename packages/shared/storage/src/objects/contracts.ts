export const MAX_STORED_OBJECT_BYTES = 25 * 1024 * 1024;
export interface StoredObject {
  readonly bytes: Uint8Array;
  readonly contentType: string;
}
export interface ObjectStorage {
  get(key: string): Promise<StoredObject | null>;
  put(key: string, object: StoredObject): Promise<void>;
}
export function assertObjectKey(key: string): void {
  if (
    key.length > 512 ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(key) ||
    key.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error('Invalid object key.');
  }
}
export function assertObjectSize(size: number): void {
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_STORED_OBJECT_BYTES) {
    throw new Error('Object exceeds the supported size.');
  }
}
