import { randomUUID } from 'node:crypto';
import type { ContentDocument } from '@frontend/ui-document';
import { MAX_PREVIEW_ENTRIES, PREVIEW_TTL_MS } from './preview-policy';
export interface PreviewSnapshot {
  readonly document: ContentDocument;
  readonly context: unknown;
}
interface PreviewEntry {
  readonly snapshot: PreviewSnapshot;
  readonly expiresAt: number;
}
export function createPreviewStore(now: () => number = Date.now) {
  const entries = new Map<string, PreviewEntry>();
  function clean() {
    for (const [id, entry] of entries) if (entry.expiresAt <= now()) entries.delete(id);
  }
  return {
    put(snapshot: PreviewSnapshot): string {
      clean();
      while (entries.size >= MAX_PREVIEW_ENTRIES) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
      const id = randomUUID();
      entries.set(id, { snapshot: structuredClone(snapshot), expiresAt: now() + PREVIEW_TTL_MS });
      return id;
    },
    get(id: string): PreviewSnapshot | undefined {
      clean();
      const entry = entries.get(id);
      return entry ? structuredClone(entry.snapshot) : undefined;
    },
  };
}
export type PreviewStore = ReturnType<typeof createPreviewStore>;
