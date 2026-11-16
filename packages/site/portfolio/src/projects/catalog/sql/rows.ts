import { z } from 'zod';
import { PortfolioDataError } from '../../data-error.js';
import { projectCategorySchema, projectSummarySchema } from '../contracts.js';
import type { ProjectCategory, ProjectSummary } from '../contracts.js';

const projectRowSchema = projectSummarySchema
  .omit({ badge: true, cover: true, categoryIds: true, links: true })
  .extend({
    pinned: z.union([z.literal(0), z.literal(1)]).transform((value) => value === 1),
    cover_key: z.string().nullable(),
    cover_alt: z.string().nullable(),
    cover_sources_json: z.string(),
    badge_type: z.enum(['text', 'image']).nullable(),
    badge_object_key: z.string().nullable(),
    badge_label: z.string().nullable(),
    badge_locale: z.string().nullable(),
    category_ids_json: z.string(),
    links_json: z.string(),
  });

export function mapProjectRow(input: unknown): ProjectSummary {
  try {
    const {
      badge_type,
      badge_object_key,
      badge_label,
      badge_locale,
      cover_key,
      cover_alt,
      cover_sources_json,
      category_ids_json,
      links_json,
      ...summary
    } = projectRowSchema.parse(input);
    const categoryIds: unknown = JSON.parse(category_ids_json);
    const links: unknown = JSON.parse(links_json);
    const coverSources: unknown =
      cover_sources_json === '{}' ? undefined : JSON.parse(cover_sources_json);
    const hasBadgeLabel = badge_label !== null && badge_locale !== null;
    return projectSummarySchema.parse({
      ...summary,
      ...(hasBadgeLabel &&
        badge_type === 'text' && {
          badge: { type: badge_type, label: badge_label, locale: badge_locale },
        }),
      ...(hasBadgeLabel &&
        badge_type === 'image' && {
          badge: {
            type: badge_type,
            objectKey: badge_object_key,
            alt: badge_label,
            locale: badge_locale,
          },
        }),
      cover:
        cover_key === null
          ? null
          : {
              objectKey: cover_key,
              alt: cover_alt,
              ...(coverSources !== undefined && { sources: coverSources }),
            },
      categoryIds,
      links,
    });
  } catch (cause) {
    throw new PortfolioDataError('invalid-project-row', 'Unable to decode a project summary row.', {
      cause,
    });
  }
}

export function mapProjectCategoryRow(input: unknown): ProjectCategory {
  try {
    return projectCategorySchema.parse(input);
  } catch (cause) {
    throw new PortfolioDataError(
      'invalid-project-row',
      'Unable to decode a project category row.',
      { cause }
    );
  }
}
