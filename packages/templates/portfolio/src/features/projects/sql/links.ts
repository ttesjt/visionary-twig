import { localeHref } from '../../../infra/resources/routing';
import { projectMediaPath, projectPath } from './routes';
import type { TextLocale } from '../../../site/text';
import type { ProjectLinks } from '../components/project-cards';

export function sqlProjectLinks(locale: TextLocale): ProjectLinks {
  return {
    detail: (project) => localeHref(projectPath(project.slug), locale),
    media: (project, key) => projectMediaPath(project.id, key),
  };
}
