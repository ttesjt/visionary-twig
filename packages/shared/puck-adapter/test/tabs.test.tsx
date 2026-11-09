import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolveDocument } from '@frontend/ui-document';
import { ContentRender } from '@frontend/puck-adapter';
import { contentRegistry } from '@frontend/puck-adapter/schema';
function input() {
  return {
    documentId: 'neutral-tabs',
    schemaVersion: 1,
    revision: 1,
    data: {
      root: {},
      content: [
        {
          type: 'Tabs',
          props: {
            id: 'sections',
            label: 'Sections',
            content: ['Introduction', 'Details'].map((label, index) => ({
              type: 'TabPanel',
              props: {
                id: `panel-${index}`,
                label,
                content: [
                  {
                    type: 'Heading',
                    props: { id: `heading-${index}`, text: `Section ${index + 1}` },
                  },
                ],
              },
            })),
          },
        },
      ],
    },
    bindings: [{ nodeId: 'panel-0', targetPath: ['label'], sourcePath: ['copy', 'intro'] }],
    variables: { copy: { intro: 'Resolved introduction' } },
  };
}
describe('native tab slots', () => {
  it('validates bindings and nested panels through the public registry and SSR renderer', () => {
    const document = input();
    expect(resolveDocument(document, contentRegistry).ok).toBe(true);
    const html = renderToStaticMarkup(<ContentRender document={document} />);
    expect(html).toContain('Resolved introduction');
    expect(html).toContain('Section 1');
    expect(html).toContain('Section 2');
    expect(html).not.toContain('style=');
  });
  it('rejects non-panel children instead of silently dropping them', () => {
    const document = input();
    const first = document.data.content[0]?.props.content[0];
    if (!first) throw new Error('Missing fixture.');
    first.type = 'Heading';
    expect(resolveDocument(document, contentRegistry).ok).toBe(false);
  });
  it('validates newly inserted empty tabs without a second metadata list', () => {
    const document = {
      ...input(),
      bindings: [],
      data: {
        root: {},
        content: [{ type: 'Tabs', props: { id: 'empty-tabs', label: 'Sections', content: [] } }],
      },
    };
    expect(resolveDocument(document, contentRegistry).ok).toBe(true);
  });
});
