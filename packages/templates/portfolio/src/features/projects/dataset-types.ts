import type {
  ProjectCategory,
  ProjectSummary,
  PublishedProjectPage,
} from '@frontend/portfolio/contracts';
import type { TextLocale } from '../../site/text.ts';

export interface ProjectDataset {
  readonly locale: TextLocale;
  readonly projects: readonly ProjectSummary[];
  readonly categories: readonly ProjectCategory[];
  readonly pages: readonly PublishedProjectPage[];
}
