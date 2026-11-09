import { describe, it, expect } from 'vitest';
import { resolveDocument, inspectResolvedData } from '@frontend/ui-document';
import { contentRegistry } from './content-registry.js';
import { normalizePuckInput } from './normalize-puck-input.js';
import { collectContentMedia } from './content-media.js';
describe('renderer contracts', () => {
  it('declares only rendered media after bindings resolve, including media nested in slots', () => {
    const image = { id: 'asset', src: '/active.svg', width: 100, height: 100, alt: 'A diagram' };
    const document = {
      documentId: 'neutral-media',
      schemaVersion: 1,
      revision: 1,
      data: {
        root: {},
        content: [
          {
            type: 'Column',
            props: {
              id: 'layout',
              content: [{ type: 'MediaFigure', props: { id: 'figure', image } }],
            },
          },
        ],
      },
      bindings: [{ nodeId: 'figure', targetPath: ['image', 'src'], sourcePath: ['assets', 'src'] }],
    };
    const resolved = resolveDocument(document, contentRegistry, {
      context: { assets: { src: '/bound.svg', unused: '/private.svg' } },
    });
    if (!resolved.ok) throw new Error(JSON.stringify(resolved.errors));
    const inspected = inspectResolvedData(resolved.value.data, contentRegistry, {});
    if (!inspected.ok) throw new Error('fixture');
    expect(
      [...inspected.value.nodes.values()].flatMap(
        ({ node, contract }) => contract.mediaSources?.(node.props) ?? []
      )
    ).toEqual(['/bound.svg']);
  });
  it('inspects background and composed media through native tab slots after binding resolution', () => {
    const image = {
      id: 'asset',
      src: '/placeholder.svg',
      width: 100,
      height: 100,
      alt: 'A diagram',
    };
    const document = {
      documentId: 'neutral-tab-media',
      schemaVersion: 1,
      revision: 1,
      data: {
        root: {},
        content: [
          {
            type: 'Tabs',
            props: {
              id: 'tabs',
              label: 'Sections',
              content: [
                {
                  type: 'TabPanel',
                  props: {
                    id: 'panel',
                    label: 'Media',
                    content: [
                      {
                        type: 'Hero',
                        props: {
                          id: 'hero',
                          title: 'Backdrop',
                          headingLevel: 1,
                          variant: 'background',
                          image,
                        },
                      },
                      {
                        type: 'MediaText',
                        props: {
                          id: 'composed',
                          content: [],
                          proportion: 'text-dominant',
                          mediaSize: 'compact',
                          body: [
                            { type: 'paragraph', content: [{ type: 'text', text: 'A caption' }] },
                          ],
                          media: {
                            type: 'gallery',
                            label: 'Diagrams',
                            images: [{ ...image, src: '/composed.svg' }],
                          },
                        },
                      },
                      {
                        type: 'MediaGallery',
                        props: {
                          id: 'strip',
                          label: 'Screenshots',
                          layout: 'strip',
                          stripSize: 'regular',
                          drag: true,
                          images: [{ ...image, src: '/strip.svg' }],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
      bindings: [{ nodeId: 'hero', targetPath: ['image', 'src'], sourcePath: ['assets', 'hero'] }],
    };
    const media = collectContentMedia(document, {
      context: { assets: { hero: '/background.svg', unused: '/private.svg' } },
    });
    expect(media).toEqual({
      ok: true,
      value: ['/background.svg', '/composed.svg', '/strip.svg'],
    });
  });
  it('normalizes native root bookkeeping while preserving unsupported zones for explicit rejection', () => {
    expect(
      normalizePuckInput({ root: { props: { id: 'root', title: '' } }, content: [], zones: {} })
    ).toEqual({ root: { props: {} }, content: [] });
    expect(
      normalizePuckInput({ root: { props: {} }, content: [], zones: { 'x:y': [] } })
    ).toHaveProperty('zones');
  });
});
