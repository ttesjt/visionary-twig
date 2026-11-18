import 'server-only';

import {
  listProjectCategories,
  listProjects,
  readProjectDetail,
  readProjectMedia,
} from '@frontend/portfolio/server';
import { projectPageRegistry } from '@frontend/portfolio/render';
import type { StorageConnection } from '@frontend/storage';
import type { PortfolioData } from './contracts';

export function createPortfolioData(
  sourceId: PortfolioData['sourceId'],
  open: () => Promise<StorageConnection>
): PortfolioData {
  return {
    sourceId,
    async projects(query) {
      const storage = await open();
      return storage.read((database) => listProjects(database, query));
    },
    async categories(locale) {
      const storage = await open();
      return storage.read((database) => listProjectCategories(database, locale));
    },
    async detail(slug, locale) {
      return readProjectDetail(await open(), projectPageRegistry, slug, locale);
    },
    async media(projectId, objectKey) {
      const storage = await open();
      return readProjectMedia(storage.database, storage.objects, projectId, objectKey);
    },
  };
}
