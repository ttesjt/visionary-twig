// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { projectSummarySchema } from '@frontend/portfolio/contracts';
import { projectMetadata } from './server';
afterEach(() => vi.unstubAllEnvs());

it('uses the resolved project language and an absolute, authorized cover URL for sharing', () => {
  vi.stubEnv('SITE_URL', 'https://site.example.test');
  const project = projectSummarySchema.parse({
    id: 'field-notes',
    slug: 'field-notes',
    locale: 'en',
    defaultLocale: 'en',
    title: 'Field Notes',
    summary: 'A small field journal.',
    cover: {
      objectKey: 'field-notes/lake.jpg',
      alt: 'A quiet lake',
      sources: { display: { objectKey: 'field-notes/lake.jpg', width: 960, height: 640 } },
    },
    categoryIds: [],
    links: [],
  });
  expect(
    projectMetadata(project, 'zh', {
      pathname: '/projects/field-notes',
      coverUrl: '/api/projects/media/field-notes?key=field-notes%2Flake.jpg',
    })
  ).toMatchObject({
    title: project.title,
    description: project.summary,
    alternates: { canonical: 'https://site.example.test/en/projects/field-notes' },
    openGraph: {
      locale: 'en_US',
      images: [
        {
          url: 'https://site.example.test/api/projects/media/field-notes?key=field-notes%2Flake.jpg',
          width: 960,
        },
      ],
    },
  });
  vi.stubEnv('SITE_URL', undefined);
  const local = projectMetadata(project, 'zh', {
    pathname: '/projects/field-notes',
    coverUrl: '/api/projects/media/field-notes?key=field-notes%2Flake.jpg',
  });
  expect(local).not.toHaveProperty('alternates');
  expect(local.openGraph).not.toHaveProperty('images');
});
