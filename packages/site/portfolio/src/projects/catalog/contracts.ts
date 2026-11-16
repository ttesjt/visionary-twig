import { intrinsicDimensionSchema, resourceUrlSchema } from '@frontend/content-blocks/schema';
import { z } from 'zod';
import { DEFAULT_PROJECT_PAGE_SIZE, projectPageSizeSchema } from '../pagination.js';
export { DEFAULT_PROJECT_PAGE_SIZE, MAX_PROJECT_PAGE_SIZE } from '../pagination.js';
import { projectLocaleSchema } from '../schemas/locale.js';
import { projectMediaKeySchema } from '../schemas/media-key.js';
import { projectIdSchema, projectSlugSchema } from '../schemas/project-id.js';

const labelSchema = z.string().trim().min(1);
export const projectCategoryIdSchema = z.string().trim().min(1);

export const projectLinkSchema = z.strictObject({
  label: labelSchema,
  href: resourceUrlSchema,
});
export type ProjectLink = z.infer<typeof projectLinkSchema>;

const projectCoverSourceSchema = z.strictObject({
  objectKey: projectMediaKeySchema,
  width: intrinsicDimensionSchema,
  height: intrinsicDimensionSchema,
});
const projectCoverSourcesSchema = z.strictObject({
  thumbnail: projectCoverSourceSchema.optional(),
  display: projectCoverSourceSchema.optional(),
  original: projectCoverSourceSchema.optional(),
});

export const projectCoverSchema = z
  .strictObject({
    objectKey: projectMediaKeySchema,
    alt: labelSchema,
    sources: projectCoverSourcesSchema.optional(),
  })
  .refine(
    ({ objectKey, sources }) => !sources?.display || sources.display.objectKey === objectKey,
    {
      message: 'The display source must describe the cover object.',
      path: ['sources', 'display', 'objectKey'],
    }
  );
export type ProjectCover = z.infer<typeof projectCoverSchema>;

export const projectBadgeSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('text'), label: labelSchema, locale: projectLocaleSchema }),
  z.strictObject({
    type: z.literal('image'),
    objectKey: projectMediaKeySchema,
    alt: labelSchema,
    locale: projectLocaleSchema,
  }),
]);
export type ProjectBadge = z.infer<typeof projectBadgeSchema>;

export const projectSummarySchema = z.strictObject({
  id: projectIdSchema,
  slug: projectSlugSchema,
  locale: projectLocaleSchema,
  defaultLocale: projectLocaleSchema,
  title: labelSchema,
  summary: labelSchema,
  pinned: z.boolean().default(false),
  badge: projectBadgeSchema.optional(),
  cover: projectCoverSchema.nullable(),
  categoryIds: z.array(projectCategoryIdSchema).readonly(),
  links: z.array(projectLinkSchema).readonly(),
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;

export const projectCategorySchema = z.strictObject({
  id: projectCategoryIdSchema,
  label: labelSchema,
  count: z.number().int().nonnegative().safe(),
});
export type ProjectCategory = z.infer<typeof projectCategorySchema>;

export const projectListQuerySchema = z.strictObject({
  locale: projectLocaleSchema,
  categoryId: projectCategoryIdSchema.optional(),
  offset: z.number().int().nonnegative().safe().default(0),
  limit: projectPageSizeSchema.default(DEFAULT_PROJECT_PAGE_SIZE),
});
export type ProjectListQuery = z.input<typeof projectListQuerySchema>;

export const projectListSchema = z.strictObject({
  projects: z.array(projectSummarySchema).readonly(),
  hasMore: z.boolean(),
});
export type ProjectList = z.infer<typeof projectListSchema>;
