import { describe, expect, it } from 'vitest';
import { createPreviewStore } from './preview-store';
import { MAX_PREVIEW_ENTRIES, PREVIEW_TTL_MS } from './preview-policy';
import type { ContentDocument } from '@frontend/ui-document';
const snapshot = {
  document: {
    documentId: 'preview',
    schemaVersion: 1,
    revision: 1,
    data: { root: {}, content: [] },
  } satisfies ContentDocument,
  context: { request: { title: 'Original' } },
};

describe('bounded process-local preview snapshots', () => {
  it('owns independent copies and expires snapshots at the configured deadline', () => {
    let now = 0;
    const store = createPreviewStore(() => now);
    const input = structuredClone(snapshot);
    const id = store.put(input);
    input.context.request.title = 'Changed';
    expect(store.get(id)?.context).toEqual(snapshot.context);
    const first = store.get(id);
    if (first) Object.assign(first.context ?? {}, { other: true });
    expect(store.get(id)?.context).toEqual(snapshot.context);
    now = PREVIEW_TTL_MS;
    expect(store.get(id)).toBeUndefined();
  });
  it('evicts oldest entries at capacity, cleans expired entries and resets with a process store', () => {
    let now = 0;
    const store = createPreviewStore(() => now);
    const first = store.put(snapshot);
    let last = first;
    for (let index = 0; index < MAX_PREVIEW_ENTRIES; index += 1) last = store.put(snapshot);
    expect(store.get(first)).toBeUndefined();
    expect(store.get(last)).toEqual(snapshot);
    expect(createPreviewStore().get(last)).toBeUndefined();
    now = PREVIEW_TTL_MS;
    const fresh = store.put(snapshot);
    expect(store.get(last)).toBeUndefined();
    expect(store.get(fresh)).toEqual(snapshot);
  });
});
