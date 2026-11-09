import { z } from 'zod';
import { demoRecordSchema, demoImageUrlSchema } from '../demo-record';
export const DEMO_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
export const MAX_DEMO_IMAGE_MIB = 5;
export const MAX_DEMO_IMAGE_BYTES = MAX_DEMO_IMAGE_MIB * 1024 * 1024;
export function validDemoImage(file: File): boolean {
  return (
    file.size > 0 &&
    file.size <= MAX_DEMO_IMAGE_BYTES &&
    DEMO_IMAGE_TYPES.some((type) => type === file.type)
  );
}
const imageSchema = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('none') }),
  z.strictObject({
    mode: z.literal('url'),
    url: demoImageUrlSchema,
  }),
  z.strictObject({
    mode: z.literal('file'),
    file: z
      .instanceof(File)
      .nullable()
      .refine((file) => file !== null && validDemoImage(file)),
  }),
]);
export const DEMO_IMAGE_MODES = imageSchema.options.map((option) => option.shape.mode.value);
export const demoDraftSchema = demoRecordSchema
  .omit({ id: true, imageUrl: true, pageId: true })
  .extend({ image: imageSchema });
export type DemoDraft = z.infer<typeof demoDraftSchema>;
export type DemoImageDraft = DemoDraft['image'];
export function createDemoDraft(): DemoDraft {
  return { title: '', summary: '', status: 'draft', image: { mode: 'none' } };
}
