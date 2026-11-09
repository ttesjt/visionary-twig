import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { resolveDocument } from '@frontend/ui-document';
import { contentRegistry } from '../content-registry.js';
import { collectContentMedia } from '../content-media.js';
import { ContentRender } from '../../render/content-render.js';

const action = { id: 'jump', label: 'Details', availability: 'available', href: '#details' };
const section = {
  type: 'Anchor',
  props: {
    id: 'anchor-node',
    name: 'details',
    content: [
      {
        type: 'Reveal',
        props: {
          id: 'reveal-node',
          effect: 'rise',
          content: [{ type: 'Heading', props: { id: 'heading-node', text: 'Details' } }],
        },
      },
    ],
  },
};
function document(content: unknown[], extra = {}) {
  return {
    schemaVersion: 1,
    revision: 1,
    documentId: 'navigation-study',
    data: { root: {}, content },
    ...extra,
  };
}
function issues(input: unknown) {
  const result = resolveDocument(input, contentRegistry);
  if (result.ok) throw new Error('Expected invalid document');
  return result.errors;
}
describe('JSON navigation and entrances', () => {
  it('renders native anchors and a visible SSR fallback without leaking bookkeeping IDs', () => {
    const input = document([
      { type: 'ActionLinks', props: { id: 'links', actions: [action] } },
      section,
    ]);
    const html = renderToStaticMarkup(<ContentRender document={input} />);
    expect(html).toContain('href="#details"');
    expect(html).toContain('id="details" tabindex="-1"');
    expect(html).toContain('data-reveal-state="idle"');
    expect(html).not.toContain('id="anchor-node"');
  });
  it('checks resolved variables and keeps original bindings and raw props intact', () => {
    const input = document(
      [{ type: 'ActionLinks', props: { id: 'links', actions: [action] } }, section],
      {
        variables: { link: '#details' },
        bindings: [{ nodeId: 'links', targetPath: ['actions', '0', 'href'], sourcePath: ['link'] }],
      }
    );
    expect(resolveDocument(input, contentRegistry).ok).toBe(true);
    expect(issues({ ...input, variables: { link: '#typo' } })[0]?.message).toContain(
      'Unknown anchor'
    );
    expect(input).toMatchObject({ variables: { link: '#details' } });
  });
  it('rejects duplicate targets, invalid names and links to undeclared targets', () => {
    expect(
      issues(
        document([section, { ...section, props: { id: 'other', name: 'details', content: [] } }])
      )[0]?.path
    ).toEqual(['data', 'content', '1', 'props', 'name']);
    expect(
      issues(document([{ ...section, props: { ...section.props, name: 'two words' } }]))[0]?.code
    ).toBe('invalid-props');
    expect(
      issues(document([{ type: 'ActionLinks', props: { id: 'links', actions: [action] } }]))[0]
        ?.message
    ).toContain('Unknown anchor');
  });
  it('finds fragment links in rich text and nested section props without treating their content as slots', () => {
    const richText = [
      { type: 'paragraph', content: [{ type: 'link', label: 'Missing', href: '#missing' }] },
    ];
    expect(
      issues(document([{ type: 'RichText', props: { id: 'text', content: richText } }, section]))[0]
        ?.path
    ).toEqual(['data', 'content', '0', 'props', 'content', '0', 'content', '0', 'href']);
    expect(
      issues(
        document([{ type: 'ContentSection', props: { id: 's', body: richText, content: [] } }])
      )[0]?.message
    ).toContain('Unknown anchor');
  });
  it('rejects targets inside potentially hidden tab panels', () => {
    expect(
      issues(
        document([
          {
            type: 'Tabs',
            props: {
              id: 'tabs',
              label: 'Studies',
              content: [
                { type: 'TabPanel', props: { id: 'panel', label: 'Study', content: [section] } },
              ],
            },
          },
        ])
      )[0]?.message
    ).toContain('outside tab panels');
  });
  it('supports explicit namespaces for multiple embeds without changing external/cross-page links or source data', () => {
    const input = document([
      {
        type: 'ActionLinks',
        props: {
          id: 'links',
          actions: [action, { ...action, id: 'external', href: '/elsewhere#details' }],
        },
      },
      section,
    ]);
    const html = renderToStaticMarkup(<ContentRender document={input} navigationScope="study-a" />);
    expect(html).toContain('id="study-a--details"');
    expect(html).toContain('href="#study-a--details"');
    expect(html).toContain('href="/elsewhere#details"');
    expect(section.props.name).toBe('details');
  });
});

it('namespaces nested destinations without ambiguous scope separators', () => {
  const nested = document([{ type: 'Column', props: { id: 'column', content: [section] } }]);
  const html = renderToStaticMarkup(<ContentRender document={nested} navigationScope="embed" />);
  expect(html).toContain('id="embed--details"');
  expect(() =>
    renderToStaticMarkup(<ContentRender document={nested} navigationScope="embed--other" />)
  ).toThrow();
});
it('retains media inspection and permissions through the new native slots', () => {
  const input = document([
    {
      type: 'Reveal',
      props: {
        id: 'entrance',
        content: [
          {
            type: 'MediaFigure',
            props: {
              id: 'media',
              image: { id: 'image', src: '/image.svg', alt: 'Study', width: 800, height: 600 },
            },
          },
        ],
      },
    },
  ]);
  expect(collectContentMedia(input)).toEqual({ ok: true, value: ['/image.svg'] });
});
