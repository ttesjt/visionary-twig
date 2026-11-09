import type { R2Bucket } from '@cloudflare/workers-types';
import { assertObjectKey, assertObjectSize, type ObjectStorage } from '@frontend/storage';
export function createR2Storage(bucket: R2Bucket): ObjectStorage {
  return {
    async get(key) {
      assertObjectKey(key);
      const object = await bucket.get(key);
      if (!object) return null;
      assertObjectSize(object.size);
      return {
        bytes: new Uint8Array(await object.arrayBuffer()),
        contentType: object.httpMetadata?.contentType ?? 'application/octet-stream',
      };
    },
    async put(key, object) {
      assertObjectKey(key);
      assertObjectSize(object.bytes.byteLength);
      await bucket.put(key, object.bytes.slice().buffer, {
        httpMetadata: { contentType: object.contentType },
      });
    },
  };
}
