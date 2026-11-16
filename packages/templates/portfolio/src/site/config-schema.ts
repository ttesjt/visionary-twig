import { z } from 'zod';
import { projectPageSizeSchema } from '@frontend/portfolio/pagination';
import { metadataImageSchema } from '../infra/metadata-schema.ts';
import { SITE_NAVIGATION_IDS } from './routes.ts';

const headerSchema = z.strictObject({
  layout: z.enum(['full-width', 'floating']).optional(),
  brandImage: metadataImageSchema.shape.src.optional(),
  hiddenNavigation: z.array(z.enum(SITE_NAVIGATION_IDS)).readonly().optional(),
});

const DEFAULT_PROJECTS_PAGE_SIZE = 6;

export const appConfigSchema = z.strictObject({
  version: z.literal(1),
  metadata: z.strictObject({ image: metadataImageSchema.optional() }).optional(),
  tracking: z.strictObject({ enabled: z.boolean() }).optional(),
  header: headerSchema.optional(),
  projects: z.strictObject({ pageSize: projectPageSizeSchema }).optional(),
  contact: z
    .strictObject({
      links: z
        .array(
          z.strictObject({
            name: z.string().trim().min(1),
            href: metadataImageSchema.shape.src,
            icon: metadataImageSchema.shape.src.optional(),
          })
        )
        .readonly()
        .refine(
          (links) => new Set(links.map(({ href }) => href)).size === links.length,
          'Contact links must have distinct targets.'
        ),
    })
    .optional(),
  home: z.strictObject({
    showIntroduction: z.boolean(),
    image: metadataImageSchema.required({ width: true, height: true }).nullable().optional(),
  }),
});
export type AppConfig = z.infer<typeof appConfigSchema>;

export function portfolioPageSize(config: AppConfig): number {
  return config.projects?.pageSize ?? DEFAULT_PROJECTS_PAGE_SIZE;
}

export const configSchemas = { app: appConfigSchema };
