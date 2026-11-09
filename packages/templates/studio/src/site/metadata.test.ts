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

it('uses prepared Studio text, its deployment origin and the private indexing policy', async () => {
  vi.stubEnv('SITE_URL', 'https://studio.example.test');
  const metadata = await siteMetadata('en', '/');
  expect(metadata).toMatchObject({
    title: 'Content Studio',
    description: 'A local workspace for editing and previewing content.',
    robots: { index: false, follow: false },
    openGraph: { title: 'Content Studio', locale: 'en_US' },
    alternates: {
      canonical: 'https://studio.example.test/en',
      languages: { en: 'https://studio.example.test/en' },
    },
  });
});

it('permits an absent origin and optional metadata configuration', async () => {
  vi.stubEnv('SITE_URL', undefined);
  vi.mocked(readGeneratedJsonURL).mockResolvedValueOnce({
    version: 1,
    workspace: { showIntroduction: false },
  });
  const metadata = await siteMetadata();
  expect(metadata).not.toHaveProperty('metadataBase');
  expect(metadata).not.toHaveProperty('alternates');
  expect(metadata).toMatchObject({
    title: 'Content Studio',
    robots: { index: false, follow: false },
  });
});

it('skips all source reads when the metadata definition is disabled', async () => {
  const load = vi.fn(metadataDefinition.load);
  expect(await prepareMetadata({ enabled: false, load }, { locale: 'en' })).toEqual({});
  expect(load).not.toHaveBeenCalled();
});

it('supports strict metadata lookups without changing ordinary resource readers', async () => {
  const strict = await serverText('en', RESOURCE_SCOPES.metadata, {
    onMissing(namespace, key) {
      throw new Error(namespace + '.' + key);
    },
  });
  // @ts-expect-error Verify diagnostics for invalid runtime input despite the generated key contract.
  expect(() => strict.getText('main', 'unknown')).toThrow('main.unknown');
  const ordinary = await serverText('en', RESOURCE_SCOPES.metadata);
  // @ts-expect-error Verify the ordinary reader's runtime fallback for the same invalid key.
  expect(ordinary.getText('main', 'unknown')).toBe('main.unknown');
});
