import { describe, expect, it } from 'vitest';
import { buildMetadata, metadataImageSchema, metadataOriginSchema } from './index';

const labels = { title: 'A small site', description: 'An independent collection.' };
describe('resolved metadata', () => {
  it('omits unset optional fields without inventing a production host', () => {
    const metadata = buildMetadata(labels);
    expect(metadata).toMatchObject({
      title: labels.title,
      description: labels.description,
      openGraph: { title: labels.title },
      twitter: { card: 'summary' },
    });
    expect(metadata).not.toHaveProperty('metadataBase');
    expect(metadata).not.toHaveProperty('alternates');
    expect(metadata.openGraph).not.toHaveProperty('url');
    expect(metadata.openGraph).not.toHaveProperty('images');
  });
  it('produces absolute localized links and image metadata from an explicit origin', () => {
    const metadata = buildMetadata({
      ...labels,
      origin: 'https://example.test',
      canonicalPath: '/zh/about',
      languagePaths: { en: '/en/about', zh: '/zh/about' },
      openGraphLocale: 'zh_CN',
      alternateOpenGraphLocales: ['en_US'],
      image: { src: '/metadata/share.png', alt: 'A small site', width: 1200, height: 630 },
    });
    expect(metadata.metadataBase?.toString()).toBe('https://example.test/');
    expect(metadata.alternates).toEqual({
      canonical: 'https://example.test/zh/about',
      languages: { en: 'https://example.test/en/about', zh: 'https://example.test/zh/about' },
    });
    expect(metadata.openGraph).toMatchObject({
      locale: 'zh_CN',
      alternateLocale: ['en_US'],
      url: 'https://example.test/zh/about',
      images: [{ url: 'https://example.test/metadata/share.png', alt: 'A small site' }],
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
  });
  it('omits origin-dependent fields but permits an explicit external image', () => {
    expect(
      buildMetadata({
        ...labels,
        canonicalPath: '/en',
        languagePaths: { en: '/en' },
        image: { src: '/metadata/share.png', alt: 'Preview' },
      }).openGraph
    ).not.toHaveProperty('images');
    expect(
      buildMetadata({
        ...labels,
        image: { src: 'https://cdn.example.test/share.png', alt: 'Preview' },
      }).openGraph
    ).toMatchObject({ images: [{ url: 'https://cdn.example.test/share.png', alt: 'Preview' }] });
  });
  it('rejects malformed declared fields instead of silently discarding them', () => {
    for (const origin of [
      '',
      'file:///tmp/site',
      'https://user:password@example.test',
      'https://example.test/path',
      'https://example.test?q=1',
      'https://example.test/#fragment',
    ])
      expect(metadataOriginSchema.safeParse(origin).success).toBe(false);
    for (const src of [
      '',
      '//foreign.test/image.png',
      '/\\foreign.test/image.png',
      'data:image/png;base64,abc',
    ])
      expect(metadataImageSchema.safeParse({ src }).success).toBe(false);
    expect(() => buildMetadata({ ...labels, title: '' })).toThrow();
    expect(() => buildMetadata({ ...labels, image: { src: '/valid.png', alt: '' } })).toThrow();
    expect(() => buildMetadata({ ...labels, canonicalPath: '//foreign.test' })).toThrow();
  });
});
