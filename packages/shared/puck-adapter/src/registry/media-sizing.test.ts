import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContentRender } from '../render/content-render.js';
import { expect, it } from 'vitest';
import { resolveDocument } from '@frontend/ui-document';
import { contentRegistry } from './content-registry.js';
import { collectContentMedia } from './content-media.js';

it('binds nested media display bounds without changing source metadata or media permissions', () => {
  const document = {
    schemaVersion: 1,
    documentId: 'media-sizing',
    revision: 1,
    data: {
      root: {},
      content: [
        {
          type: 'MediaText',
          props: {
            id: 'study',
            body: [],
            content: [],
            media: {
              type: 'image',
              image: {
                id: 'portrait',
                src: '/portrait.svg',
                alt: 'Portrait',
                width: 480,
                height: 800,
              },
              presentation: { width: 'full', maxHeight: 'regular', align: 'center' },
            },
          },
        },
      ],
    },
    bindings: [
      { nodeId: 'study', targetPath: ['media', 'presentation', 'width'], sourcePath: ['width'] },
    ],
  };
  expect(resolveDocument(document, contentRegistry, { context: { width: 'compact' } }).ok).toBe(
    true
  );
  expect(collectContentMedia(document, { context: { width: 'compact' } })).toEqual({
    ok: true,
    value: ['/portrait.svg'],
  });
  const html = renderToStaticMarkup(
    createElement(ContentRender, { document, context: { width: 'compact' } })
  );
  expect(html).toContain('data-media-width="compact"');
  expect(html).toContain('width="480" height="800"');
  expect(resolveDocument(document, contentRegistry, { context: { width: '240px' } }).ok).toBe(
    false
  );
});
