import { expect, it } from 'vitest';
import { resolveDocument } from '@frontend/ui-document';
import { contentRegistry } from './content-registry.js';
import { collectContentMedia } from './content-media.js';

it('resolves bound carousel options through native JSON without changing media permissions', () => {
  const document = {
    schemaVersion: 1,
    documentId: 'gallery-options',
    revision: 1,
    data: {
      root: {},
      content: [
        {
          type: 'MediaGallery',
          props: {
            id: 'slides',
            label: 'Studies',
            images: [{ id: 'study', src: '/study.svg', alt: 'A study', width: 100, height: 100 }],
            navigation: 'overlay',
            pagination: 'dots',
            transition: 'fade',
          },
        },
      ],
    },
    bindings: [
      { nodeId: 'slides', targetPath: ['pagination'], sourcePath: ['presentation', 'pagination'] },
    ],
  };
  const resolved = resolveDocument(document, contentRegistry, {
    context: { presentation: { pagination: 'thumbnails' } },
  });
  expect(resolved.ok).toBe(true);
  expect(
    collectContentMedia(document, { context: { presentation: { pagination: 'thumbnails' } } })
  ).toEqual({ ok: true, value: ['/study.svg'] });
  expect(
    resolveDocument(document, contentRegistry, {
      context: { presentation: { pagination: 'unknown' } },
    }).ok
  ).toBe(false);
});
