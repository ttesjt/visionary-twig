import { projectCategorySchema } from '@frontend/portfolio/contracts';
import { DEFAULT_TEXT_LOCALE, type TextLocale } from '../../site/text';

export interface ProjectLocation {
  readonly category: string | null;
  readonly page: number;
}

type SearchValue = string | readonly string[] | undefined;
export interface ProjectSearchParameters {
  readonly category?: SearchValue;
  readonly page?: SearchValue;
}

function single(value: SearchValue): string | undefined {
  return typeof value === 'string' ? value : value?.length === 1 ? value[0] : undefined;
}

export function projectPageOffset(page: string | undefined, pageSize: number): number | undefined {
  if (page === undefined) return 0;
  if (!/^[1-9]\d*$/u.test(page)) return undefined;
  const value = Number(page);
  const offset = (value - 1) * pageSize;
  return Number.isSafeInteger(value) && Number.isSafeInteger(offset) ? offset : undefined;
}

export function parseProjectLocation(
  parameters: ProjectSearchParameters,
  pageSize: number
): ProjectLocation {
  const category = projectCategorySchema.shape.id.safeParse(single(parameters.category));
  const rawPage = single(parameters.page);
  return {
    category: category.success ? category.data : null,
    page:
      rawPage !== undefined && projectPageOffset(rawPage, pageSize) !== undefined
        ? Number(rawPage)
        : 1,
  };
}

export function projectLocationHref(
  pathname: string,
  search: string,
  hash: string,
  locale: TextLocale,
  { category, page }: ProjectLocation
): string {
  const parameters = new URLSearchParams(search);
  if (!parameters.has('lang') && locale !== DEFAULT_TEXT_LOCALE) parameters.set('lang', locale);
  if (category === null) parameters.delete('category');
  else parameters.set('category', category);
  if (page === 1) parameters.delete('page');
  else parameters.set('page', String(page));
  return pathname + (parameters.size ? '?' + parameters.toString() : '') + hash;
}
