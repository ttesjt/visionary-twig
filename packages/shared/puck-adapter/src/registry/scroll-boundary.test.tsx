import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { resolveDocument } from '@frontend/ui-document';
import { contentRegistry } from './content-registry.js';
import { ContentRender } from '../render/content-render.js';
import { collectContentMedia } from './content-media.js';

function document(offset: unknown = 0) {
  return {
    schemaVersion: 1,
    documentId: 'boundary-study',
    revision: 1,
    data: {
      root: {},
      content: [
        {
          type: 'ScrollBoundary',
          props: {
            id: 'boundary',
            range: 'within',
            offset,
            content: [
              {
                type: 'MediaFigure',
                props: {
                  id: 'figure',
                  image: { id: 'study', src: '/study.svg', alt: 'Study', width: 800, height: 600 },
                },
              },
            ],
          },
        },
      ],
    },
    variables: { offset: 48 },
    bindings: [{ nodeId: 'boundary', targetPath: ['offset'], sourcePath: ['offset'] }],
  };
}
it('renders native JSON slots and a readable pending SSR state after resolving variables', () => {
  const input = document('bound placeholder');
  expect(resolveDocument(input, contentRegistry).ok).toBe(true);
  const html = renderToStaticMarkup(<ContentRender document={input} />);
  expect(html).toContain('data-scroll-boundary-state="pending"');
  expect(html).toContain('alt="Study"');
  expect(html).not.toContain('id="boundary"');
  expect(collectContentMedia(input)).toEqual({ ok: true, value: ['/study.svg'] });
  expect(input.data.content[0]?.props.offset).toBe('bound placeholder');
});
it('rejects invalid resolved behavior, callbacks, DOM roots and header targets in JSON', () => {
  const input = document();
  expect(resolveDocument({ ...input, variables: { offset: -1 } }, contentRegistry).ok).toBe(false);
  for (const extra of [
    { onStateChange: 'run()' },
    { scrollRoot: '#panel' },
    { target: 'header' },
  ]) {
    const node = input.data.content[0];
    if (!node) throw new Error('Missing node');
    expect(
      resolveDocument(
        {
          ...input,
          data: { root: {}, content: [{ ...node, props: { ...node.props, ...extra } }] },
        },
        contentRegistry
      ).ok
    ).toBe(false);
  }
});
