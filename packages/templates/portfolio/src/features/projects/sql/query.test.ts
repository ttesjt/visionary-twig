import { expect, it } from 'vitest';
import { appConfigSchema, portfolioPageSize } from '../../../site/config-schema';
import { parseProjectLocation } from '../project-location';
import { projectListQuery, projectListUrl } from './query';
import { parseProjectRequest } from './query';

it('uses configured capacity for SSR and API queries while preserving legacy offsets', () => {
  const config = appConfigSchema.parse({
    version: 1,
    home: { showIntroduction: true },
    projects: { pageSize: 12 },
  });
  const size = portfolioPageSize(config);
  const query = parseProjectRequest(new URLSearchParams('locale=en&category=web&page=3'), size);
  expect(query).toMatchObject({
    success: true,
    data: projectListQuery('en', parseProjectLocation({ category: 'web', page: '3' }, size), size),
  });
  expect(parseProjectRequest(new URLSearchParams('locale=en&offset=24'), size)).toMatchObject({
    success: true,
    data: { offset: 24, limit: 12 },
  });
  expect(parseProjectRequest(new URLSearchParams('locale=en&page=-1'), size).success).toBe(false);
  expect(appConfigSchema.safeParse({ ...config, projects: { pageSize: 101 } }).success).toBe(false);
});

it('shares the category and one-based page between the route and the data request', () => {
  const location = parseProjectLocation({ category: ['web'], page: '2' }, 12);
  expect(location).toEqual({ category: 'web', page: 2 });
  expect(projectListQuery('zh', location, 12)).toEqual({
    locale: 'zh',
    categoryId: 'web',
    offset: 12,
    limit: 12,
  });
  expect(projectListUrl('zh', location)).toBe('/api/projects?locale=zh&page=2&category=web');
});
