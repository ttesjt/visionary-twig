import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolveDocument } from '@frontend/ui-document';
import { ContentRender, InvalidContentDocument, serverConfig } from '@frontend/puck-adapter';
import {
  contentRegistry,
  componentSchemas,
  COMPONENT_NAMES,
  DOCUMENT_COMPONENT_NAMES,
  DOCUMENT_SLOT_COMPONENTS,
} from '@frontend/puck-adapter/schema';
import {
  SPACES,
  GRID_COLUMNS,
  CONTAINER_WIDTHS,
  ALIGNS,
  COLLAPSES,
} from '@frontend/ui/layout-options';

function document(type = 'Heading', props: Record<string, unknown> = { text: '', level: 2 }) {
  return {
    documentId: 'test',
    schemaVersion: 1,
    revision: 1,
    data: { root: { props: {} }, content: [{ type, props: { id: 'node', ...props } }] },
    variables: { page: { title: 'Resolved heading' } },
    bindings: [{ nodeId: 'node', targetPath: ['text'], sourcePath: ['page', 'title'] }],
  };
}
describe('real schema and Puck registration', () => {
  it('has exactly one contract/render per name, preserving native slot field definitions', () => {
    expect(Object.keys(contentRegistry.nodes)).toEqual(DOCUMENT_COMPONENT_NAMES);
    expect(Object.keys(serverConfig.components)).toEqual(DOCUMENT_COMPONENT_NAMES);
    for (const name of DOCUMENT_SLOT_COMPONENTS)
      expect(serverConfig.components[name]?.fields?.content).toEqual({
        type: 'slot',
        allow: name === 'Tabs' ? ['TabPanel'] : DOCUMENT_COMPONENT_NAMES,
      });
    expect(serverConfig.components.RichText?.fields?.content).toBeUndefined();
  });
  it('uses foundation option definitions without widening JSON to DOM props', () => {
    expect(componentSchemas.Row.shape.space.unwrap().options).toEqual(SPACES);
    expect(componentSchemas.Row.shape.align.unwrap().options).toEqual(ALIGNS);
    expect(componentSchemas.Grid.shape.columns.unwrap().values).toEqual(new Set(GRID_COLUMNS));
    expect(componentSchemas.Grid.shape.collapse.unwrap().options).toEqual(COLLAPSES);
    expect(componentSchemas.Container.shape.width.unwrap().options).toEqual(CONTAINER_WIDTHS);
    for (const name of COMPONENT_NAMES) {
      const contract = contentRegistry.nodes[name];
      expect(contract?.isBindingTarget(['className'])).toBe(false);
      expect(contract?.isBindingTarget(['style'])).toBe(false);
    }
  });
  it('checks nested business paths from arrays/unions and rejects unknown fields', () => {
    const gallery = contentRegistry.nodes.MediaGallery;
    expect(gallery?.isBindingTarget(['images', '0', 'alt'])).toBe(true);
    expect(gallery?.isBindingTarget(['images', '0', 'html'])).toBe(false);
    expect(gallery?.isBindingTarget(['images', 'length'])).toBe(false);
    expect(
      contentRegistry.nodes.RichText?.isBindingTarget(['content', '0', 'content', '0', 'text'])
    ).toBe(true);
    expect(contentRegistry.nodes.MediaText?.isBindingTarget(['media', 'image', 'src'])).toBe(true);
  });
  it('resolves then renders final real content and reports invalid documents', () => {
    const input = document();
    expect(renderToStaticMarkup(<ContentRender document={input} />)).toContain('Resolved heading');
    expect(input).toMatchObject({ data: { content: [{ props: { text: '' } }] } });
    expect(() => renderToStaticMarkup(<ContentRender document={document('Unknown')} />)).toThrow(
      InvalidContentDocument
    );
    expect(resolveDocument({ ...input, bindings: [] }, contentRegistry).ok).toBe(false);
  });
  it('renders native slots as actual layout children, including nested Row/Column/Grid', () => {
    const input = {
      ...document(),
      bindings: [],
      data: {
        root: {},
        content: [
          {
            type: 'Row',
            props: {
              id: 'row',
              content: [
                {
                  type: 'Column',
                  props: {
                    id: 'col',
                    content: [
                      {
                        type: 'Grid',
                        props: {
                          id: 'grid',
                          columns: 2,
                          content: [
                            { type: 'Heading', props: { id: 'a', text: 'A' } },
                            { type: 'Heading', props: { id: 'b', text: 'B' } },
                          ],
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
    };
    const html = renderToStaticMarkup(<ContentRender document={input} />);
    expect(html).toMatch(/class="ui-row"[^>]*><div class="ui-column"/);
    expect(html).toMatch(/class="ui-grid"[^>]*><h2/);
    expect(html).toContain('data-columns="2"');
  });
});
