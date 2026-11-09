import { z } from 'zod';
import type { ContentResult } from '@frontend/ui-document';
import type { StudioRecordSource, StudioRecordUpdater } from '@frontend/studio/data/records';
export const readingSchema = z.strictObject({
  slug: z.string(),
  details: z.strictObject({ heading: z.string().min(1) }),
  minutes: z.number().int().positive(),
});
export type Reading = z.infer<typeof readingSchema>;
export const readingSeeds: readonly Reading[] = [
  { slug: 'shelf/stars', details: { heading: 'Star charts' }, minutes: 12 },
  { slug: 'shelf/gardens', details: { heading: 'Garden notes' }, minutes: 8 },
];
export function validateReading(input: unknown): ContentResult<Reading> {
  const parsed = readingSchema.safeParse(input);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : {
        ok: false,
        errors: [
          { code: 'invalid-reading', path: ['details'], message: 'Check the reading fields.' },
        ],
      };
}
export function createReadingAdapter(
  beforeWrite: (signal: AbortSignal) => Promise<void>
): StudioRecordSource<Reading> & StudioRecordUpdater<Reading> {
  let rows = structuredClone(readingSeeds);
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => rows,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async update(input, signal, baseline) {
      try {
        await beforeWrite(signal);
      } catch {
        return { status: 'unavailable' };
      }
      if (signal.aborted) return { status: 'cancelled' };
      const checked = validateReading(input);
      if (!checked.ok) return { status: 'invalid', errors: checked.errors };
      if (!rows.some((row) => row.slug === checked.value.slug)) return { status: 'not-found' };
      const current = rows.find((row) => row.slug === input.slug);
      if (JSON.stringify(current) !== JSON.stringify(baseline)) return { status: 'conflict' };
      const record = structuredClone(checked.value);
      rows = rows.map((row) => (row.slug === record.slug ? record : row));
      for (const listener of listeners) listener();
      return { status: 'saved', record };
    },
  };
}
