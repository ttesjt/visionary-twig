import { useMemo, useSyncExternalStore } from 'react';
import { validDemoImage } from '../publishing/draft';
import type { DemoObjectUrls } from '../adapters/blob-images';
const browserUrls: DemoObjectUrls = {
  create: (blob) => URL.createObjectURL(blob),
  revoke: (url) => URL.revokeObjectURL(url),
};
const serverSnapshot = () => undefined;
/** Preview is a temporary local resource, separate from the publication image adapter. */
export function createFilePreview(file: File | null, urls: DemoObjectUrls) {
  let url: string | undefined;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => url,
    subscribe(this: void, listener: () => void) {
      listeners.add(listener);
      if (!url && file && validDemoImage(file)) {
        url = urls.create(file);
        for (const notify of listeners) notify();
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size && url) {
          urls.revoke(url);
          url = undefined;
        }
      };
    },
  };
}
export function useFilePreview(file: File | null): string | undefined {
  const preview = useMemo(() => createFilePreview(file, browserUrls), [file]);
  return useSyncExternalStore(preview.subscribe, preview.getSnapshot, serverSnapshot);
}
