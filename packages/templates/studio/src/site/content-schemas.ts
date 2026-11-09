import { z } from 'zod';
import { DEMO_RECORD_IDS, demoRecordSchema } from '../workspace/demo/demo-record.ts';
const record = demoRecordSchema.pick({ title: true, summary: true });
export const contentSchemas = { base: z.record(z.enum(DEMO_RECORD_IDS), record) };
export type StudioSeed = z.infer<typeof contentSchemas.base>;
