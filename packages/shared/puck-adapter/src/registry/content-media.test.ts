import { expect, it } from 'vitest';
import {
  DEFAULT_CONTENT_LIMITS,
  prepareSave,
  resolveDocument,
  type ContentDocument,
} from '@frontend/ui-document';
import { contentRegistry } from './content-registry.js';
import { collectContentMedia } from './content-media.js';

const image = { id: 'image', src: '/images/used.svg', alt: 'A study', width: 64, height: 64 };
const document: ContentDocument = {
  documentId: 'media-inspection',
  schemaVersion: 1,
  revision: 1,
  data: {
    root: {},
    content: [
      {
        type: 'Column',
        props: {
          id: 'column',
          content: [
            { type: 'Hero', props: { id: 'hero', title: 'A story', headingLevel: 1, image } },
            { type: 'MediaFigure', props: { id: 'figure', image: { ...image, src: '' } } },
            { type: 'MediaGallery', props: { id: 'gallery', label: 'Studies', images: [image] } },
            {
              type: 'MediaText',
              props: { id: 'image-text', content: [], media: { type: 'image', image }, body: [] },
            },
            {
              type: 'MediaText',
              props: {
                id: 'gallery-text',
                content: [],
                media: { type: 'gallery', label: 'Studies', images: [image] },
                body: [],
              },
            },
            {
              type: 'Video',
              props: {
                id: 'video',
                label: 'A film',
                sources: [{ src: '/film.mp4', type: 'video/mp4' }],
                poster: '/poster.svg',
                width: 640,
                height: 360,
                tracks: [
                  { src: '/captions.vtt', srcLang: 'en', label: 'English', kind: 'captions' },
                ],
              },
            },
            {
              type: 'ActionLinks',
              props: {
                id: 'links',
                actions: [
                  {
                    id: 'link',
                    availability: 'available',
                    label: '/private.svg',
                    href: '/private.svg',
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  },
  bindings: [{ nodeId: 'figure', targetPath: ['image', 'src'], sourcePath: ['assets', 'used'] }],
};
it('collects resolved media in registered nested slots, including galleries, video/poster/tracks, with deduplication', () => {
  expect(
    collectContentMedia(document, {
      context: { assets: { used: '/bound.svg', unused: '/private.svg' } },
    })
  ).toEqual({
    ok: true,
    value: ['/images/used.svg', '/bound.svg', '/film.mp4', '/poster.svg', '/captions.vtt'],
  });
  expect(document.data.content[0]?.props.id).toBe('column');
  expect(JSON.stringify(document)).not.toContain('/bound.svg');
});
it('rejects missing bindings, malformed props and unknown nodes instead of scanning arbitrary JSON', () => {
  expect(collectContentMedia(document).ok).toBe(false);
  expect(collectContentMedia({ ...document, bindings: [] }).ok).toBe(false);
  expect(
    collectContentMedia({
      ...document,
      data: {
        root: {},
        content: [{ type: 'Unknown', props: { id: 'unknown', src: '/private.svg' } }],
      },
    }).ok
  ).toBe(false);
});

it.each([
  { payloadBytes: 800_000, maxBytes: DEFAULT_CONTENT_LIMITS.maxBytes },
  { payloadBytes: 350_000, maxBytes: 1_000_000 },
])(
  'accepts independently bounded raw and resolved trees without double-counting variables ($payloadBytes bytes)',
  ({ payloadBytes, maxBytes }) => {
    const large: ContentDocument = {
      documentId: 'large-bound-document',
      schemaVersion: 1,
      revision: 1,
      variables: { summary: 'x'.repeat(payloadBytes) },
      data: {
        root: {},
        content: [
          { type: 'Hero', props: { id: 'first', title: 'First', headingLevel: 1, summary: '' } },
          { type: 'Hero', props: { id: 'second', title: 'Second', headingLevel: 2, summary: '' } },
          { type: 'MediaFigure', props: { id: 'image', image } },
        ],
      },
      bindings: ['first', 'second'].map((nodeId) => ({
        nodeId,
        targetPath: ['summary'],
        sourcePath: ['summary'],
      })),
    };
    const options = { limits: { maxBytes } };
    expect(prepareSave(large, contentRegistry, {}, options).ok).toBe(true);
    const resolved = resolveDocument(large, contentRegistry, options);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) throw new Error('Expected a valid expanded document.');
    expect(
      new TextEncoder().encode(
        JSON.stringify({ ...resolved.value.document, data: resolved.value.data })
      ).byteLength
    ).toBeGreaterThan(maxBytes);
    expect(collectContentMedia(large, options)).toEqual({ ok: true, value: [image.src] });
    expect(collectContentMedia(large, { limits: { maxBytes: payloadBytes } }).ok).toBe(false);
  }
);
