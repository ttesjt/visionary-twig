import { contentLimits } from '../document/limits.js';
import { capture } from '../document/errors.js';
import { snapshotJson } from '../json/snapshot.js';
import type { DocumentOptions } from '../document/types.js';
import type { ContentRegistry } from '../registry/contracts.js';
import type {
  ContentReadResult,
  ContentSaveResult,
  ContentStore,
  ContentVersion,
  ReadOptions,
  SaveOptions,
} from './contracts.js';
import { assertContentKey, prepareSave } from './prepare-save.js';

export interface MemoryStoreOptions extends DocumentOptions {
  readonly registry: ContentRegistry;
}

interface Snapshot {
  readonly rawJson: string;
  readonly version: ContentVersion;
}

/** Process-local development/test storage. All state is lost when this instance is discarded. */
export function createMemoryContentStore(options: MemoryStoreOptions): ContentStore {
  const limits = contentLimits(options.limits);
  const snapshots = new Map<string, Snapshot>();

  return {
    read(key: string, request: ReadOptions = {}): Promise<ContentReadResult> {
      assertContentKey(key);
      if (request.signal?.aborted) return Promise.resolve({ status: 'cancelled' });
      const snapshot = snapshots.get(key);
      return Promise.resolve(
        snapshot
          ? { status: 'found', rawJson: snapshot.rawJson, version: { ...snapshot.version } }
          : { status: 'not-found' }
      );
    },
    save(key: string, input: unknown, request: SaveOptions = {}): Promise<ContentSaveResult> {
      assertContentKey(key);
      if (request.signal?.aborted) return Promise.resolve({ status: 'cancelled' });
      const prepared = prepareSave(input, options.registry, request, { limits });
      if (!prepared.ok) return Promise.resolve({ status: 'invalid', errors: prepared.errors });
      if (request.signal?.aborted) return Promise.resolve({ status: 'cancelled' });
      // Validation is synchronous; checking and replacing the snapshot is one atomic turn.
      const current = snapshots.get(key);
      if (
        (request.expectedRevision !== undefined &&
          request.expectedRevision !== (current?.version.revision ?? 0)) ||
        (request.expectedEtag !== undefined && request.expectedEtag !== current?.version.etag)
      ) {
        return Promise.resolve({
          status: 'conflict',
          ...(current === undefined ? {} : { currentVersion: { ...current.version } }),
        });
      }
      const revision = (current?.version.revision ?? 0) + 1;
      if (!Number.isSafeInteger(revision))
        return Promise.resolve({
          status: 'unavailable',
          reason: 'invalid-response',
          message: 'Revision capacity exhausted.',
        });
      const version = { revision, etag: `"memory-${revision}"` };
      const persisted = capture(
        () => snapshotJson({ ...prepared.value, revision }, limits),
        prepared.value.documentId
      );
      if (!persisted.ok) return Promise.resolve({ status: 'invalid', errors: persisted.errors });
      const rawJson = JSON.stringify(persisted.value);
      snapshots.set(key, { rawJson, version });
      return Promise.resolve({ status: 'saved', version: { ...version } });
    },
  };
}
