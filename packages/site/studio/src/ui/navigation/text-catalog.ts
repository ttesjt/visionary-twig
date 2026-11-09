import { z } from 'zod';
import defaults from './default.json' with { type: 'json' };
const text = z.string().trim().min(1);
export const studioDiscardTextSchema = z.strictObject({
  title: text,
  description: text,
  cancel: text,
  confirm: text,
});
export type StudioDiscardText = z.infer<typeof studioDiscardTextSchema>;
export const DEFAULT_STUDIO_DISCARD_TEXT = studioDiscardTextSchema.parse(defaults);
