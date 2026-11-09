import { demoRecordSchema, demoImageUrlSchema, type DemoRecord } from '../demo-record';
import type { DemoImageAdapter, DemoRecordAdapter, UploadedDemoImage } from '../adapters/contracts';
import { demoDraftSchema } from './draft';
export type DemoPublishStage = 'image' | 'record';
export type DemoPublishResult =
  | { readonly status: 'created'; readonly record: DemoRecord }
  | { readonly status: 'invalid' }
  | { readonly status: 'cancelled' }
  | { readonly status: 'busy' }
  | { readonly status: 'failed'; readonly stage: DemoPublishStage };
export interface DemoPublisher {
  publish(
    input: unknown,
    signal: AbortSignal,
    onStage?: (stage: DemoPublishStage) => void
  ): Promise<DemoPublishResult>;
  dispose(): void;
}
/** Template-owned example workflow. A real host may replace the workflow as well as either adapter. */
export function createDemoPublisher(ports: {
  readonly images: DemoImageAdapter;
  readonly records: DemoRecordAdapter;
  readonly createId: () => string;
}): DemoPublisher {
  let cached: { readonly file: File; readonly image: UploadedDemoImage } | undefined;
  let recordId: string | undefined;
  let busy = false;
  let disposed = false;
  let committed: DemoRecord | undefined;
  function release() {
    if (cached) {
      ports.images.release(cached.image);
      cached = undefined;
    }
  }
  return {
    async publish(input, signal, onStage) {
      if (disposed || signal.aborted) return { status: 'cancelled' };
      if (busy) return { status: 'busy' };
      if (committed) return { status: 'created', record: committed };
      const parsed = demoDraftSchema.safeParse(input);
      if (!parsed.success) return { status: 'invalid' };
      const draft = parsed.data;
      busy = true;
      let stage: DemoPublishStage = 'image';
      try {
        let imageUrl: string | undefined;
        if (cached && (draft.image.mode !== 'file' || cached.file !== draft.image.file)) release();
        if (draft.image.mode === 'file') {
          const file = draft.image.file;
          if (!file) return { status: 'invalid' };
          onStage?.('image');
          if (!cached) {
            const uploaded = await ports.images.upload(file, signal);
            if (!demoImageUrlSchema.safeParse(uploaded.url).success) {
              ports.images.release(uploaded);
              throw new Error('The image adapter returned an invalid URL.');
            }
            cached = { file, image: uploaded };
          }
          signal.throwIfAborted();
          imageUrl = cached.image.url;
        } else if (draft.image.mode === 'url') imageUrl = draft.image.url;
        signal.throwIfAborted();
        stage = 'record';
        onStage?.(stage);
        recordId ??= ports.createId();
        const record = demoRecordSchema.parse({
          id: recordId,
          title: draft.title,
          summary: draft.summary,
          status: draft.status,
          ...(imageUrl ? { imageUrl } : {}),
        });
        const saved = demoRecordSchema.parse(await ports.records.create(record, signal));
        if (saved.id !== recordId)
          throw new Error('The adapter returned a different record identity.');
        // A successful write can complete after cancellation; keep its referenced image alive.
        committed = saved;
        cached = undefined;
        return { status: 'created', record: saved };
      } catch {
        return signal.aborted || disposed ? { status: 'cancelled' } : { status: 'failed', stage };
      } finally {
        busy = false;
        if (disposed && !committed) release();
      }
    },
    dispose() {
      disposed = true;
      if (!busy) release();
    },
  };
}
