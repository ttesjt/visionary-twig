import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { resolveDocument, hasRenderableContent } from '@frontend/ui-document';
import { ContentRender } from '../render/content-render.js';
import { contentRegistry } from './content-registry.js';
import { collectContentMedia } from './content-media.js';
const image = { id: 'diagram', src: '/diagram.svg', alt: 'A diagram', width: 640, height: 480 };
function document() {
  return {
    schemaVersion: 1,
    revision: 1,
    documentId: 'reading',
    variables: { title: 'A small study', unusedMedia: '/unused.svg' },
    bindings: [{ nodeId: 'navigation', targetPath: ['title'], sourcePath: ['title'] }],
    data: {
      root: {},
      content: [
        {
          type: 'ContentNavigation',
          props: {
            id: 'navigation',
            title: 'bound title',
            label: 'Chapters',
            progressLabel: 'Progress',
            items: [{ label: 'Overview', href: '#overview' }],
            content: [
              {
                type: 'Anchor',
                props: {
                  id: 'anchor',
                  name: 'overview',
                  content: [{ type: 'Heading', props: { id: 'heading', text: 'Overview' } }],
                },
              },
            ],
          },
        },
        { type: 'MediaFigure', props: { id: 'diagram-figure', image } },
      ],
    },
  };
}
it('resolves real JSON, scopes navigation and retains raw bindings while inspecting only consumed media', () => {
  const input = document();
  const result = resolveDocument(input, contentRegistry);
  expect(result.ok && result.value.data.content[0]?.props.title).toBe('A small study');
  const html = renderToStaticMarkup(<ContentRender document={input} navigationScope="embed" />);
  expect(html).toContain('href="#embed--overview"');
  expect(html).toContain('id="embed--overview"');
  expect(html).toContain('src="/diagram.svg"');
  expect(html).not.toContain('style=');
  expect(collectContentMedia(input)).toEqual({ ok: true, value: ['/diagram.svg'] });
  expect(input.data.content[0]?.props.title).toBe('bound title');
});

it('rejects chapter destinations outside their reading region and duplicate reading regions', () => {
  const input = document();
  const navigation = input.data.content[0];
  if (!navigation) throw new Error('Missing fixture');
  expect(
    resolveDocument(
      {
        ...input,
        data: {
          root: {},
          content: [
            { ...navigation, props: { ...navigation.props, content: [] } },
            { type: 'Anchor', props: { id: 'outside', name: 'overview', content: [] } },
          ],
        },
      },
      contentRegistry
    ).ok
  ).toBe(false);
  expect(
    resolveDocument(
      {
        ...input,
        data: {
          root: {},
          content: [
            navigation,
            {
              ...navigation,
              props: {
                ...navigation.props,
                id: 'second',
                items: [{ label: 'Second', href: '#second' }],
                content: [
                  { type: 'Anchor', props: { id: 'second-anchor', name: 'second', content: [] } },
                ],
              },
            },
          ],
        },
      },
      contentRegistry
    ).ok
  ).toBe(false);
});
it('reports the retired project recommendation node as unsupported', () => {
  const input = document();
  const result = resolveDocument(
    {
      ...input,
      data: {
        root: {},
        content: [
          {
            type: 'ProjectRecommendations',
            props: { id: 'related', title: 'More work', items: [] },
          },
        ],
      },
    },
    contentRegistry
  );
  expect(result).toMatchObject({ ok: false, errors: [{ code: 'unknown-node' }] });
});

it('follows readable navigation children to determine content presence', () => {
  expect(
    hasRenderableContent(
      {
        root: {},
        content: [
          {
            type: 'ContentNavigation',
            props: {
              id: 'navigation',
              label: 'Chapters',
              progressLabel: 'Progress',
              items: [{ label: 'Overview', href: '#overview' }],
              content: [{ type: 'Anchor', props: { id: 'anchor', name: 'overview', content: [] } }],
            },
          },
        ],
      },
      contentRegistry
    )
  ).toEqual({ ok: true, value: false });
});

it.each(['reading', 'content', 'full'])(
  'renders the JSON inlineWidth %s without constraining the reading body',
  (inlineWidth) => {
    const input = document();
    const navigation = input.data.content[0];
    if (!navigation) throw new Error('Missing reading fixture');
    const configured = {
      ...input,
      data: {
        ...input.data,
        content: [{ ...navigation, props: { ...navigation.props, inlineWidth } }],
      },
    };
    expect(resolveDocument(configured, contentRegistry).ok).toBe(true);
    const html = renderToStaticMarkup(<ContentRender document={configured} />);
    expect(html).toContain(`data-width="${inlineWidth}"`);
    expect(html).toContain('class="ui-content-navigation-body"');
    expect(html).toContain('Overview');
  }
);
