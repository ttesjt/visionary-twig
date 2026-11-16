import { projectListQuerySchema } from '@frontend/portfolio/contracts';
import { z } from 'zod';
import { projectPageOffset, type ProjectLocation } from '../project-location';
import type { TextLocale } from '../../../site/text';
import { PROJECT_ENDPOINTS } from './routes';
import { TEXT_LOCALES } from '../../../site/text';

export const portfolioLocaleSchema = z.enum(TEXT_LOCALES);
const nonnegativeInteger = z
  .string()
  .regex(/^(0|[1-9]\d*)$/u)
  .transform(Number);

export const projectRequestSchema = projectListQuerySchema.extend({
  locale: portfolioLocaleSchema,
});

export function parseProjectRequest(params: URLSearchParams, pageSize: number) {
  const page = params.get('page');
  const offset = nonnegativeInteger.safeParse(params.get('offset') ?? '0');
  return projectRequestSchema.safeParse({
    locale: params.get('locale'),
    ...(params.has('category') ? { categoryId: params.get('category') } : {}),
    offset:
      page === null
        ? offset.success
          ? offset.data
          : Number.NaN
        : (projectPageOffset(page, pageSize) ?? Number.NaN),
    limit: pageSize,
  });
}

export function projectListQuery(
  locale: TextLocale,
  { category, page }: ProjectLocation,
  pageSize: number
) {
  return {
    locale,
    ...(category === null ? {} : { categoryId: category }),
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function projectListUrl(locale: TextLocale, { category, page }: ProjectLocation): string {
  const query = new URLSearchParams({ locale, page: String(page) });
  if (category !== null) query.set('category', category);
  return PROJECT_ENDPOINTS.list + '?' + query.toString();
}
