import { z } from 'zod';
import defaults from './default.json' with { type: 'json' };
import { JSON_SECTIONS } from './draft-model.js';
const text = z.string().trim().min(1);
export const studioJsonTextCatalogSchema = z.strictObject({
  title: text,
  section: text,
  sections: z.record(z.enum(JSON_SECTIONS), text),
  format: text,
  validate: text,
  apply: text,
  reset: text,
  resetTitle: text,
  resetDescription: text,
  cancel: text,
  draft: text,
  current: text,
  conflict: text,
  issues: text,
});
export type StudioJsonTextCatalog = z.infer<typeof studioJsonTextCatalogSchema>;
export const DEFAULT_STUDIO_JSON_TEXT: StudioJsonTextCatalog =
  studioJsonTextCatalogSchema.parse(defaults);
