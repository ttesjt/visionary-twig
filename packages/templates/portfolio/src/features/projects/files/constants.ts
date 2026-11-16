export const PROJECT_FILE_INDEX = 'projects';
export const PROJECT_FILES_PATH = '/examples/content-projects';
import { PROJECT_FILE_PAGES } from '../../../site/project-data.ts';
export { PROJECT_FILE_PAGES } from '../../../site/project-data.ts';
export type ProjectFileNamespace = (typeof PROJECT_FILE_PAGES)[number]['namespace'];

export function findProjectFilePage(slug: string): (typeof PROJECT_FILE_PAGES)[number] | undefined {
  return PROJECT_FILE_PAGES.find((page) => page.slug === slug);
}

export function projectFilePath(slug: string): string {
  return PROJECT_FILES_PATH + '/' + encodeURIComponent(slug);
}

/** Keys are validated as relative public asset paths during preparation. */
export function projectFileMedia(key: string): string {
  return '/' + key.split('/').map(encodeURIComponent).join('/');
}
