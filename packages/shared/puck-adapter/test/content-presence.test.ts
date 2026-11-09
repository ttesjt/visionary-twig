import { describe, expect, it } from 'vitest';
import { hasRenderableContent, resolveDocument } from '@frontend/ui-document';
import { contentRegistry } from '@frontend/puck-adapter/schema';

function presence(content: readonly unknown[]) {
  return hasRenderableContent({ root: {}, content }, contentRegistry);
}
describe('registered renderer content semantics', () => {
  it('treats nested layout-only nodes and empty text as empty', () => {
    expect(
      presence([
        {
          type: 'Row',
          props: {
            id: 'row',
            content: [
              {
                type: 'Container',
                props: {
                  id: 'container',
                  content: [
                    { type: 'Column', props: { id: 'column', content: [] } },
                    { type: 'Grid', props: { id: 'grid', content: [] } },
                    {
                      type: 'RichText',
                      props: {
                        id: 'text',
                        content: [{ type: 'paragraph', content: [{ type: 'text', text: '  ' }] }],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ])
    ).toEqual({ ok: true, value: false });
    expect(presence([{ type: 'Tabs', props: { id: 'tabs', label: 'Tabs', content: [] } }])).toEqual(
      { ok: true, value: false }
    );
    expect(
      presence([
        { type: 'ContentSection', props: { id: 'section', surface: 'plain', content: [] } },
      ])
    ).toEqual({ ok: true, value: false });
  });
  it('inspects runtime composition children without counting the wrapper as content', () => {
    for (const node of [
      { type: 'Anchor', props: { id: 'anchor', name: 'chapter' } },
      { type: 'Reveal', props: { id: 'reveal' } },
      { type: 'ScrollBoundary', props: { id: 'boundary' } },
    ]) {
      expect(presence([{ ...node, props: { ...node.props, content: [] } }])).toEqual({
        ok: true,
        value: false,
      });
      expect(
        presence([
          {
            ...node,
            props: {
              ...node.props,
              content: [{ type: 'Heading', props: { id: 'child', text: 'Visible chapter' } }],
            },
          },
        ])
      ).toEqual({ ok: true, value: true });
    }
  });
  it('retains visual sections, separators, media and text nested in layouts', () => {
    for (const child of [
      { type: 'ContentSection', props: { id: 'section', surface: 'muted', content: [] } },
      { type: 'Separator', props: { id: 'rule' } },
      {
        type: 'MediaFigure',
        props: {
          id: 'figure',
          image: { id: 'image', src: '/test.svg', alt: 'Sample', width: 100, height: 100 },
        },
      },
      {
        type: 'RichText',
        props: {
          id: 'text',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Visible' }] }],
        },
      },
    ])
      expect(presence([{ type: 'Row', props: { id: 'row', content: [child] } }])).toEqual({
        ok: true,
        value: true,
      });
  });
  it('evaluates resolved variables without altering the raw document and rejects invalid content', () => {
    const raw = {
      documentId: 'presence',
      schemaVersion: 1,
      revision: 1,
      data: {
        root: {},
        content: [{ type: 'ContentSection', props: { id: 'section', content: [] } }],
      },
      bindings: [{ nodeId: 'section', targetPath: ['surface'], sourcePath: ['page', 'surface'] }],
    };
    const resolved = resolveDocument(raw, contentRegistry, {
      context: { page: { surface: 'raised' } },
    });
    if (!resolved.ok) throw new Error(JSON.stringify(resolved.errors));
    expect(hasRenderableContent(resolved.value.data, contentRegistry)).toEqual({
      ok: true,
      value: true,
    });
    expect(raw.data.content[0]?.props).not.toHaveProperty('surface');
    expect(presence([{ type: 'Heading', props: { id: 'heading', text: '' } }]).ok).toBe(false);
  });
});
