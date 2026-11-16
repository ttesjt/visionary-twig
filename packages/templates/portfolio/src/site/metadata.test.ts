// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('../infra/resources/server', async (original) => {
  const actual = await original<typeof import('../infra/resources/server')>();
  return { ...actual, readGeneratedJsonURL: vi.fn(actual.readGeneratedJsonURL) };
});
import { readGeneratedJsonURL, serverText } from '../infra/resources/server';
import { prepareMetadata } from '../infra/metadata/server';
import { metadataDefinition, siteMetadata } from './metadata';
import { RESOURCE_SCOPES } from './resource-scopes';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it('reads both prepared languages and emits locale-specific canonical and reciprocal language links', async () => {
  vi.stubEnv('SITE_URL', 'https://site.example.test');
  for (const [locale, title, description, og] of [
    ['en', 'Plain Next.js', 'A clean Next.js starting point.', 'en_US'],
    ['zh', '简洁的 Next.js', '一个干净的 Next.js 起点。', 'zh_CN'],
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
  expect(metadata.title).toBe('Plain Next.js');
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
  expect(() => reader.getText('demo', 'title')).toThrow('demo.title');
  const ordinary = await serverText('en', RESOURCE_SCOPES.metadata);
  expect(ordinary.getText('demo', 'title')).toBe('demo.title');
});
