import { z } from 'zod';
import { intrinsicDimensionSchema, resourceUrlSchema } from '@frontend/content-blocks/schema';
import {
  projectIdSchema,
  projectSlugSchema,
  projectMediaKeySchema,
} from '@frontend/portfolio/identity';
import { contentTextReferenceSchema } from '../../../infra/content-text-reference.ts';
import { PROJECT_FILE_PAGES } from './constants.ts';

const label = z.union([z.string().trim().min(1), contentTextReferenceSchema]);
const imageSource = z.strictObject({
  objectKey: projectMediaKeySchema,
  width: intrinsicDimensionSchema,
  height: intrinsicDimensionSchema,
});
const cover = z.strictObject({
  objectKey: projectMediaKeySchema,
  alt: label,
  sources: z
    .strictObject({
      display: imageSource.optional(),
      thumbnail: imageSource.optional(),
      original: imageSource.optional(),
    })
    .optional(),
});
const badge = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('text'), label }),
  z.strictObject({ type: z.literal('image'), objectKey: projectMediaKeySchema, alt: label }),
]);

export const projectFileCatalogSchema = z
  .strictObject({
    categories: z.array(z.strictObject({ id: projectIdSchema, label })),
    projects: z.array(
      z.strictObject({
        id: projectIdSchema,
        slug: projectSlugSchema,
        title: label,
        summary: label,
        pinned: z.boolean(),
        sortOrder: z.number().int().safe(),
        categoryIds: z.array(projectIdSchema),
        cover: cover.nullable(),
        badge: badge.optional(),
        links: z.array(z.strictObject({ label, href: resourceUrlSchema })),
      })
    ),
  })
  .superRefine((catalog, context) => {
    const unique = (values: readonly string[], path: (string | number)[]) => {
      if (new Set(values).size !== values.length)
        context.addIssue({ code: 'custom', message: 'Duplicate project identifier.', path });
    };
    unique(
      catalog.categories.map(({ id }) => id),
      ['categories']
    );
    unique(
      catalog.projects.map(({ id }) => id),
      ['projects']
    );
    unique(
      catalog.projects.map(({ slug }) => slug),
      ['projects']
    );
    const categories = new Set(catalog.categories.map(({ id }) => id));
    catalog.projects.forEach((project, index) => {
      unique(project.categoryIds, ['projects', index, 'categoryIds']);
      if (project.categoryIds.some((id) => !categories.has(id)))
        context.addIssue({
          code: 'custom',
          message: 'Unknown category.',
          path: ['projects', index, 'categoryIds'],
        });
      if (
        project.cover?.sources?.display &&
        project.cover.sources.display.objectKey !== project.cover.objectKey
      )
        context.addIssue({
          code: 'custom',
          message: 'Display source must describe the cover.',
          path: ['projects', index, 'cover'],
        });
    });
    if (PROJECT_FILE_PAGES.some((page) => !catalog.projects.some(({ slug }) => slug === page.slug)))
      context.addIssue({
        code: 'custom',
        message: 'Registered page has no project.',
        path: ['projects'],
      });
  });

const jsonObjectSchema = z.record(z.string(), z.unknown()).superRefine((value, context) => {
  const result = z.json().safeParse(value);
  if (!result.success) {
    for (const issue of result.error.issues)
      context.addIssue({ code: 'custom', message: issue.message, path: issue.path });
  }
});
export const projectFilePageSchema = z.strictObject({
  document: jsonObjectSchema,
  context: jsonObjectSchema,
});
export type ProjectFileCatalog = z.output<typeof projectFileCatalogSchema>;
