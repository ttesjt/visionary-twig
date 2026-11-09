import galleryDefaults from './text/gallery.json' with { type: 'json' };
import viewerDefaults from './text/viewer.json' with { type: 'json' };
import { z } from 'zod';
import { textTemplateSchema } from '@frontend/text-catalog';
import { meaningfulTextSchema } from '../shared/url.schema.js';

export const galleryTextCatalogSchema = z.strictObject({
  carouselRoleDescription: meaningfulTextSchema.optional(),
  previous: meaningfulTextSchema.optional(),
  next: meaningfulTextSchema.optional(),
  failure: meaningfulTextSchema.optional(),
  empty: meaningfulTextSchema.optional(),
  choose: meaningfulTextSchema.optional(),
  pause: meaningfulTextSchema.optional(),
  resume: meaningfulTextSchema.optional(),
  count: textTemplateSchema(['current', 'total']).optional(),
  countLabel: textTemplateSchema(['current', 'total']).optional(),
  stripHint: textTemplateSchema(['total']).optional(),
  viewImage: textTemplateSchema(['description']).optional(),
  showImage: textTemplateSchema(['current', 'description']).optional(),
  viewerLabel: textTemplateSchema(['label']).optional(),
});
export const DEFAULT_GALLERY_TEXT = Object.freeze(
  galleryTextCatalogSchema.required().parse(galleryDefaults)
);
export type GalleryText = z.infer<typeof galleryTextCatalogSchema>;
export const viewerTextSchema = z.strictObject({
  previous: meaningfulTextSchema.optional(),
  next: meaningfulTextSchema.optional(),
  loading: meaningfulTextSchema.optional(),
  retry: meaningfulTextSchema.optional(),
  close: meaningfulTextSchema.optional(),
  controls: meaningfulTextSchema.optional(),
  zoomOut: meaningfulTextSchema.optional(),
  zoomIn: meaningfulTextSchema.optional(),
  actualSize: meaningfulTextSchema.optional(),
  reset: meaningfulTextSchema.optional(),
  expand: meaningfulTextSchema.optional(),
  restore: meaningfulTextSchema.optional(),
  fit: meaningfulTextSchema.optional(),
  viewport: meaningfulTextSchema.optional(),
  hint: meaningfulTextSchema.optional(),
  selection: meaningfulTextSchema.optional(),
  failure: meaningfulTextSchema.optional(),
  scale: textTemplateSchema(['percent']).optional(),
  selectImage: textTemplateSchema(['current', 'total']).optional(),
  count: textTemplateSchema(['current', 'total']).optional(),
});
export const DEFAULT_VIEWER_TEXT = Object.freeze(viewerTextSchema.required().parse(viewerDefaults));
export type ViewerText = z.infer<typeof viewerTextSchema>;

function definedText(overrides: GalleryText | ViewerText | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(overrides ?? {}))
    if (value !== undefined) result[key] = value;
  return result;
}
export function resolveGalleryText(overrides?: GalleryText) {
  return galleryTextCatalogSchema
    .required()
    .parse({ ...DEFAULT_GALLERY_TEXT, ...definedText(overrides) });
}
export function resolveViewerText(overrides?: ViewerText) {
  return viewerTextSchema.required().parse({ ...DEFAULT_VIEWER_TEXT, ...definedText(overrides) });
}
