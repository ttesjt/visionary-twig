import { SITE_ROUTES } from '../../../site/routes.ts';

export function projectPath(slug: string): string {
  return SITE_ROUTES.projects + '/' + encodeURIComponent(slug);
}

export const PROJECT_ENDPOINTS = {
  list: '/api/projects',
  categories: '/api/projects/categories',
  media: '/api/projects/media',
} as const;

export function projectMediaPath(id: string, objectKey: string): string {
  return (
    PROJECT_ENDPOINTS.media +
    '/' +
    encodeURIComponent(id) +
    '?' +
    new URLSearchParams({ key: objectKey }).toString()
  );
}
