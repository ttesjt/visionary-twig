import type { ProjectCategory, ProjectList } from '@frontend/portfolio/contracts';
import type { ProjectDetail } from '@frontend/portfolio/server';
import type { StoredObject } from '@frontend/storage';
import type { TextLocale } from '../../../site/text';

export interface ProjectQuery {
  readonly locale: TextLocale;
  readonly categoryId?: string | undefined;
  readonly offset: number;
  readonly limit: number;
}

export interface PortfolioData {
  readonly sourceId: () => Promise<string>;
  projects(query: ProjectQuery): Promise<ProjectList>;
  categories(locale: TextLocale): Promise<readonly ProjectCategory[]>;
  detail(slug: string, locale: TextLocale): Promise<ProjectDetail>;
  media(projectId: string, objectKey: string): Promise<StoredObject | null>;
}
