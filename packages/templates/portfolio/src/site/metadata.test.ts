// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('../infra/resources/server', async (original) => {
  const actual = await original<typeof import('../infra/resources/server')>();
  return { ...actual, readGeneratedJsonURL: vi.fn(actual.readGeneratedJsonURL) };
});
import { readGeneratedJsonURL, serverText } from '../infra/resources/server';
import { prepareMetadata } from '../infra/metadata/server';
import { metadataDefinition, projectMetadata, siteMetadata } from './metadata';
import { RESOURCE_SCOPES } from './resource-scopes';
import { projectSummarySchema } from '@frontend/portfolio/contracts';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it('reads both prepared languages and emits locale-specific canonical and reciprocal language links', async () => {
  vi.stubEnv('SITE_URL', 'https://site.example.test');
  for (const [locale, title, description, og] of [
    ['en', 'Portfolio', 'Selected projects and ways to get in touch.', 'en_US'],
    ['zh', '作品集', '精选项目与联系方式。', 'zh_CN'],
  ] as const) {
    const metadata = await siteMetadata(locale, '/');
    expect(metadata).toMatchObject({
      title,
      description,
      openGraph: { title, description, locale: og },
    });
    expect(metadata.alternates).toEqual({
      canonical: 'https://site.example.test/' + locale,
      languages: { en: 'https://site.example.test/en', zh: 'https://site.example.test/zh' },
    });
  }
  const root = await siteMetadata('zh');
  expect(root).not.toHaveProperty('alternates');
  expect(root.openGraph).not.toHaveProperty('url');
});
it('permits an absent deployment origin and optional configuration fields', async () => {
  vi.stubEnv('SITE_URL', undefined);
  vi.mocked(readGeneratedJsonURL).mockResolvedValueOnce({
    version: 1,
    home: { showIntroduction: true },
  });
  const metadata = await siteMetadata('en', '/');
  expect(metadata.title).toBe('Portfolio');
  expect(metadata).not.toHaveProperty('metadataBase');
  expect(metadata).not.toHaveProperty('alternates');
  expect(metadata.openGraph).not.toHaveProperty('images');
});
it('skips even malformed environment and missing resources when the site switch is off', async () => {
  vi.stubEnv('SITE_URL', 'not a URL');
  expect(
    await prepareMetadata({ ...metadataDefinition, enabled: false }, { locale: 'en' })
  ).toEqual({});
  expect(readGeneratedJsonURL).not.toHaveBeenCalled();
});
it('reports malformed configuration and missing declared resources without swallowing their errors', async () => {
  vi.stubEnv('SITE_URL', undefined);
  const error = new Error('Missing prepared custom settings JSON');
  vi.mocked(readGeneratedJsonURL).mockRejectedValueOnce(error);
  await expect(siteMetadata('en')).rejects.toBe(error);
  vi.mocked(readGeneratedJsonURL).mockResolvedValueOnce({
    version: 1,
    home: { showIntroduction: true },
    metadata: { image: { src: '' } },
  });
  await expect(siteMetadata('en')).rejects.toThrow();
  vi.stubEnv('SITE_URL', 'https://example.test/path');
  await expect(siteMetadata('en')).rejects.toThrow('SITE_URL');
});
it('rejects an invalid explicit page path before creating language URLs', async () => {
  for (const path of ['', '//foreign.test', '/about?search=1', 'https://foreign.test'])
    await expect(siteMetadata('en', path)).rejects.toThrow();
});
it('uses strict missing-text handling while ordinary readers retain their placeholder policy', async () => {
  const onMissing = (namespace: string, key: string) => {
    throw new Error('Missing metadata text: ' + namespace + '.' + key);
  };
  const reader = await serverText('en', RESOURCE_SCOPES.metadata, { onMissing });
  // @ts-expect-error a renamed/deleted metadata key is a type error as well as a runtime error
  expect(() => reader.getText('main', 'metadata.typo')).toThrow('main.metadata.typo');
  const ordinary = await serverText('en', RESOURCE_SCOPES.metadata);
  // @ts-expect-error exercise the ordinary reader's fallback for a deleted key
  expect(ordinary.getText('main', 'metadata.typo')).toBe('main.metadata.typo');
});

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
