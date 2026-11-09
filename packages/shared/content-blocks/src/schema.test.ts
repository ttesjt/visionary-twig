import { describe, expect, it } from 'vitest';
import { CONTAINER_WIDTHS } from '@frontend/ui/layout';
import {
  actionLinkSchema,
  actionLinksPropsSchema,
  contentSectionPropsSchema,
  CONTENT_WIDTHS,
  headingPropsSchema,
  heroPropsSchema,
  imageAssetSchema,
  imageAssetsSchema,
  linkUrlSchema,
  mediaFigurePropsSchema,
  mediaGalleryPropsSchema,
  mediaTextPropsSchema,
  resourceUrlSchema,
  richTextPropsSchema,
  richTextSchema,
  videoPropsSchema,
} from './schema.js';

const image = {
  id: 'diagram',
  src: '/diagram.svg',
  alt: 'System diagram',
  width: 1200,
  height: 800,
};
const paragraph = { type: 'paragraph', content: [{ type: 'text', text: '长文 Long content' }] };

describe('public serializable contracts', () => {
  it('keeps content width presets aligned with foundation without runtime React in schema', () => {
    expect(CONTENT_WIDTHS).toEqual(CONTAINER_WIDTHS);
  });
  it.each([
    'javascript:alert(1)',
    'data:image/svg+xml,test',
    '//evil.test/a',
    '/\\evil.test',
    'https://user:pass@host.test/a',
    ' https://host.test',
    'https://host.test/\nfoo',
    'ftp://host.test/a',
    'images/a.png',
  ])('rejects unsafe media URL %s', (src) => {
    expect(resourceUrlSchema.safeParse(src).success).toBe(false);
  });
  it.each([
    '/image%20one.gif',
    '/images/a.svg?version=1',
    'https://cdn.test/a.webp',
    'http://localhost:3112/a.png',
  ])('accepts supported asset URL %s', (src) => {
    expect(resourceUrlSchema.parse(src)).toBe(src);
  });
  it('only accepts named fragments for links', () => {
    expect(linkUrlSchema.parse('#details')).toBe('#details');
    expect(linkUrlSchema.safeParse('#').success).toBe(false);
    expect(resourceUrlSchema.safeParse('#details').success).toBe(false);
  });
  it.each([
    { width: 0 },
    { height: -1 },
    { width: 1.5 },
    { alt: '' },
    { decorative: true },
    { decorative: true, alt: 'Not decorative' },
  ])('rejects invalid image semantics %j', (changes) => {
    expect(imageAssetSchema.safeParse({ ...image, ...changes }).success).toBe(false);
  });
  it('allows explicit decorative images and rejects duplicate image IDs', () => {
    expect(imageAssetSchema.parse({ ...image, decorative: true, alt: '' }).alt).toBe('');
    expect(imageAssetsSchema.safeParse([image, image]).success).toBe(false);
    expect(imageAssetsSchema.parse([])).toEqual([]);
  });
  it('supports the same structured text for rendering and editing', () => {
    expect(
      richTextSchema.parse([
        paragraph,
        { type: 'heading', level: 3, content: [{ type: 'strong', text: 'Title' }] },
        {
          type: 'list',
          ordered: true,
          items: [
            {
              content: [
                { type: 'link', href: '/docs', label: 'Read' },
                { type: 'emphasis', text: 'more' },
              ],
            },
          ],
        },
      ])
    ).toHaveLength(3);
    for (const node of [
      { type: 'html', html: '<script/>' },
      { ...paragraph, style: {} },
      { type: 'heading', level: 99, content: [] },
      { type: 'paragraph', content: [{ type: 'link', href: 'javascript:alert(1)', label: 'X' }] },
    ]) {
      expect(richTextSchema.safeParse([node]).success).toBe(false);
    }
  });
  it('models unavailable actions without fake URLs or callbacks', () => {
    const unavailable = {
      id: 'ios',
      label: 'iOS',
      availability: 'unavailable',
      reason: 'Coming later',
    };
    expect(actionLinkSchema.safeParse(unavailable).success).toBe(true);
    expect(actionLinkSchema.safeParse({ ...unavailable, href: '#' }).success).toBe(false);
    expect(actionLinkSchema.safeParse({ ...unavailable, reason: '' }).success).toBe(false);
    expect(actionLinksPropsSchema.safeParse({ actions: [unavailable, unavailable] }).success).toBe(
      false
    );
  });
  it('rejects arbitrary styling and code in every block and permits adapter ID composition', () => {
    const contracts = [
      [headingPropsSchema, { text: 'Title' }],
      [heroPropsSchema, { title: 'Hero', headingLevel: 1 }],
      [richTextPropsSchema, { content: [paragraph] }],
      [actionLinksPropsSchema, { actions: [] }],
      [contentSectionPropsSchema, {}],
      [mediaFigurePropsSchema, { image }],
      [mediaGalleryPropsSchema, { images: [], label: 'Gallery' }],
      [mediaTextPropsSchema, { media: { type: 'image', image }, body: [] }],
      [
        videoPropsSchema,
        {
          label: 'Demo',
          sources: [{ src: '/demo.webm', type: 'video/webm' }],
          width: 800,
          height: 450,
        },
      ],
    ] as const;
    for (const [schema, props] of contracts) {
      expect(schema.safeParse(props).success).toBe(true);
      for (const extra of [{ style: {} }, { className: 'arbitrary' }, { onClick: () => {} }]) {
        expect(schema.safeParse({ ...props, ...extra }).success).toBe(false);
      }
    }
    expect(
      headingPropsSchema
        .extend({ id: imageAssetSchema.shape.id })
        .parse({ text: 'Title', id: 'puck-id' }).id
    ).toBe('puck-id');
    expect(heroPropsSchema.safeParse({ title: 'Implicit h1' }).success).toBe(false);
  });
  it('rejects video embeds, invalid sources, dimensions and competing default tracks', () => {
    const video = {
      label: 'Demo',
      sources: [{ src: '/demo.mp4', type: 'video/mp4' }],
      width: 800,
      height: 450,
    };
    for (const changes of [
      { iframe: 'https://test' },
      { sources: [] },
      { height: 0 },
      { sources: [{ src: 'javascript:x', type: 'video/mp4' }] },
      {
        tracks: ['en', 'zh'].map((srcLang) => ({
          src: '/captions.vtt',
          srcLang,
          label: srcLang,
          kind: 'captions',
          default: true,
        })),
      },
    ]) {
      expect(videoPropsSchema.safeParse({ ...video, ...changes }).success).toBe(false);
    }
  });
});

it('shares the same bounded content widths for sections and Hero, without numeric styles', () => {
  for (const width of ['reading', 'content', 'full']) {
    expect(heroPropsSchema.safeParse({ title: 'A story', headingLevel: 1, width }).success).toBe(
      true
    );
    expect(contentSectionPropsSchema.safeParse({ width }).success).toBe(true);
  }
  for (const width of ['76rem', 'screen', 1200]) {
    expect(heroPropsSchema.safeParse({ title: 'A story', headingLevel: 1, width }).success).toBe(
      false
    );
    expect(contentSectionPropsSchema.safeParse({ width }).success).toBe(false);
  }
});

it('accepts bounded Hero layout controls and rejects raw CSS values', () => {
  const base = { title: 'A cover', headingLevel: 1 };
  for (const contentPosition of ['start', 'center', 'end'])
    expect(heroPropsSchema.safeParse({ ...base, contentPosition }).success).toBe(true);
  for (const key of ['spaceBefore', 'spaceAfter', 'contentGap']) {
    for (const value of ['none', 'content', 'section'])
      expect(heroPropsSchema.safeParse({ ...base, [key]: value }).success).toBe(true);
    for (const value of ['80px', 80, 'arbitrary'])
      expect(heroPropsSchema.safeParse({ ...base, [key]: value }).success).toBe(false);
  }
  expect(heroPropsSchema.safeParse({ ...base, contentPosition: 'left' }).success).toBe(false);
});

it('validates bounded carousel presentation without leaking arbitrary engine settings', () => {
  expect(
    mediaGalleryPropsSchema.safeParse({
      images: [],
      label: 'Gallery',
      navigation: 'below',
      pagination: 'dots',
      transition: 'fade',
    }).success
  ).toBe(true);
  expect(
    mediaGalleryPropsSchema.safeParse({ images: [], label: 'Gallery', navigation: 'leftish' })
      .success
  ).toBe(false);
  expect(
    mediaGalleryPropsSchema.safeParse({ images: [], label: 'Gallery', duration: 500 }).success
  ).toBe(false);
});
