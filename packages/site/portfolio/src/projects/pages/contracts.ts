import type { ContentDocument, JsonObject } from '@frontend/ui-document';
import { z } from 'zod';
import { projectLocaleSchema } from '../schemas/locale.js';
import { projectIdSchema } from '../schemas/project-id.js';

export const projectPageIdentitySchema = z.strictObject({
  projectId: projectIdSchema,
  locale: projectLocaleSchema,
  revision: z.number().int().positive().safe(),
});

export type PublishedProjectPage = Readonly<
  z.infer<typeof projectPageIdentitySchema> & {
    document: ContentDocument;
    context: JsonObject;
  }
>;
