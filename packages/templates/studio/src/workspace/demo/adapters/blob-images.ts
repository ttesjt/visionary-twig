import type { DemoImageAdapter } from './contracts';
export interface DemoObjectUrls {
  create(this: void, blob: Blob): string;
  revoke(this: void, url: string): void;
}
/** An in-browser stand-in for object storage; no network request is made. */
export function createBlobImageAdapter(
  urls: DemoObjectUrls
): DemoImageAdapter & { dispose(): void } {
  const owned = new Set<string>();
  return {
    upload(file, signal) {
      signal.throwIfAborted();
      const url = urls.create(file);
      owned.add(url);
      return Promise.resolve({ url });
    },
    release(image) {
      if (owned.delete(image.url)) urls.revoke(image.url);
    },
    dispose() {
      for (const url of owned) urls.revoke(url);
      owned.clear();
    },
  };
}
