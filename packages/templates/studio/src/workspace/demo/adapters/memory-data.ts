import { parseProject, preparePublication, encodeProject } from '@frontend/studio/data';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import {
  demoRecordSchema,
  demoRecordFingerprint,
  parseDemoRecord,
  type DemoRecord,
} from '../demo-record';
import type { DemoRecordStore } from './contracts';
import type {
  DemoPage,
  DemoPageAdapter,
  DemoPageResult,
  DemoPageSummary,
} from '../pages/contracts';
import { demoPageWriteSchema, demoPageUnlinkSchema } from '../pages/page-validation';
interface StoredPage {
  readonly summary: DemoPageSummary;
  readonly json: string;
}
/** One owner commits pages and item references before notifying either subscriber. */
export function createMemoryDemoAdapter(seed: readonly DemoRecord[]): {
  readonly records: DemoRecordStore;
  readonly pages: DemoPageAdapter;
} {
  let records: readonly DemoRecord[] = Object.freeze(
    seed.map((record) => {
      const parsed = demoRecordSchema.parse(record);
      if (parsed.pageId) throw new Error('Seed pages must be created through publication.');
      return Object.freeze(parsed);
    })
  );
  if (new Set(records.map((record) => record.id)).size !== records.length)
    throw new Error('Duplicate demo seed identity.');
  let pages: readonly DemoPageSummary[] = Object.freeze([]);
  const content = new Map<string, StoredPage>();
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  function notify() {
    for (const listener of listeners) listener();
  }
  function load(id: string): DemoPageResult {
    const stored = content.get(id);
    if (!stored) return { status: 'not-found' };
    const parsed = parseProject(stored.json, contentRegistry);
    if (!parsed.ok) return { status: 'invalid', errors: parsed.errors };
    const page: DemoPage = {
      ...stored.summary,
      project: parsed.value,
      itemId: records.find((record) => record.pageId === id)?.id ?? null,
    };
    return { status: 'found', page };
  }
  function commit(summary: DemoPageSummary, json: string, itemId: string | null): DemoPageResult {
    content.set(summary.id, { summary: Object.freeze(summary), json });
    pages = Object.freeze([...content.values()].map((value) => value.summary));
    records = Object.freeze(
      records.map((record) => {
        const { pageId, ...fields } = record;
        if (record.id === itemId) return Object.freeze({ ...fields, pageId: summary.id });
        return pageId === summary.id ? Object.freeze(fields) : record;
      })
    );
    const result = load(summary.id);
    notify();
    return result;
  }
  const invalid = (): DemoPageResult => ({
    status: 'invalid',
    errors: [{ code: 'invalid-demo-page', path: [], message: 'Invalid demo page operation.' }],
  });
  return {
    records: {
      getSnapshot: () => records,
      subscribe,
      create(input, signal) {
        signal.throwIfAborted();
        const record = Object.freeze(demoRecordSchema.parse(input));
        if (record.pageId) throw new Error('Only page publication can attach a page.');
        const existing = records.find((value) => value.id === record.id);
        if (existing) {
          if (JSON.stringify(existing) !== JSON.stringify(record))
            throw new Error('Demo record identity conflict.');
          return Promise.resolve(existing);
        }
        records = Object.freeze([...records, record]);
        notify();
        return Promise.resolve(record);
      },
      update(input, signal, baseline) {
        if (signal.aborted) return Promise.resolve({ status: 'cancelled' });
        const result = parseDemoRecord(input);
        if (!result.ok) return Promise.resolve({ status: 'invalid', errors: result.errors });
        const parsed = result.value;
        const current = records.find((record) => record.id === parsed.id);
        if (!current) return Promise.resolve({ status: 'not-found' });
        if (
          current.id !== baseline.id ||
          demoRecordFingerprint(current) !== demoRecordFingerprint(baseline)
        )
          return Promise.resolve({ status: 'conflict' });
        const { pageId: ignored, ...fields } = parsed;
        void ignored;
        const record = Object.freeze({
          ...fields,
          ...(current.pageId ? { pageId: current.pageId } : {}),
        });
        records = Object.freeze(records.map((value) => (value.id === record.id ? record : value)));
        notify();
        return Promise.resolve({ status: 'saved', record });
      },
    },
    pages: {
      getSnapshot: () => pages,
      subscribe,
      load: (id, signal) => Promise.resolve(signal.aborted ? { status: 'cancelled' } : load(id)),
      publish(input, signal) {
        if (signal.aborted) return Promise.resolve({ status: 'cancelled' });
        const result = demoPageWriteSchema.safeParse(input);
        if (!result.success) return Promise.resolve(invalid());
        const write = result.data;
        const snapshot = preparePublication(write.project, contentRegistry, write.locales);
        if (!snapshot.ok) return Promise.resolve({ status: 'invalid', errors: snapshot.errors });
        const previous = content.get(write.id);
        const currentItem = records.find((record) => record.pageId === write.id)?.id ?? null;
        if (
          (previous?.summary.revision ?? 0) !== write.expectedRevision ||
          currentItem !== write.expectedItemId
        )
          return Promise.resolve({ status: 'conflict' });
        if (currentItem !== null && write.itemId !== currentItem)
          return Promise.resolve({ status: 'conflict' });
        if (write.itemId !== null) {
          const item = records.find((record) => record.id === write.itemId);
          if (!item || (item.pageId && item.pageId !== write.id))
            return Promise.resolve({ status: 'conflict' });
        }
        const { publishing: ignored, ...project } = snapshot.value.project;
        void ignored;
        const summary = { id: write.id, title: write.title, revision: write.expectedRevision + 1 };
        return Promise.resolve(commit(summary, encodeProject(project), write.itemId));
      },
      unlink(input, signal) {
        if (signal.aborted) return Promise.resolve({ status: 'cancelled' });
        const result = demoPageUnlinkSchema.safeParse(input);
        if (!result.success) return Promise.resolve(invalid());
        const stored = content.get(input.id);
        if (!stored) return Promise.resolve({ status: 'not-found' });
        if (
          stored.summary.revision !== input.expectedRevision ||
          !records.some(
            (record) => record.id === input.expectedItemId && record.pageId === input.id
          )
        )
          return Promise.resolve({ status: 'conflict' });
        return Promise.resolve(
          commit({ ...stored.summary, revision: stored.summary.revision + 1 }, stored.json, null)
        );
      },
    },
  };
}
