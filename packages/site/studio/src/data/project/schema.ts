import { z } from 'zod';
import type { ContentDocument, JsonObject } from '@frontend/ui-document';
export const STUDIO_PROJECT_KIND = 'studio-project';
export const STUDIO_FORMAT_VERSION = 1;
export const DEFAULT_PROJECT_LOCALE = 'en';
export const MAX_STUDIO_PROJECT_BYTES = 8 * 1024 * 1024;
export const MAX_PROJECT_HISTORY = 100;
export const localeSchema = z.string().regex(/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/);
export const publicationTargetSchema = z.strictObject({
  targetId: z.string().trim().min(1).max(256),
  key: z.string().trim().min(1).max(256),
  version: z
    .strictObject({ revision: z.number().int().nonnegative().safe(), etag: z.string().optional() })
    .optional(),
});
export const projectMetadataSchema = z.strictObject({
  kind: z.literal(STUDIO_PROJECT_KIND),
  formatVersion: z.literal(STUDIO_FORMAT_VERSION),
  defaultLocale: localeSchema,
});
export const projectEnvelopeSchema = z.strictObject({
  metadata: projectMetadataSchema,
  document: z.unknown(),
  catalogs: z.record(localeSchema, z.unknown()),
  context: z.unknown(),
  publishing: z
    .strictObject({
      source: publicationTargetSchema.optional(),
      target: publicationTargetSchema.optional(),
    })
    .optional(),
});
export type PublicationTarget = z.infer<typeof publicationTargetSchema>;
export interface StudioProject {
  readonly metadata: z.infer<typeof projectMetadataSchema>;
  readonly document: ContentDocument;
  readonly catalogs: Readonly<Record<string, JsonObject>>;
  readonly context: JsonObject;
  readonly publishing?: z.infer<typeof projectEnvelopeSchema>['publishing'];
}
