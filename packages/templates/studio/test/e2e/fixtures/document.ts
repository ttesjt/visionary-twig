import type { ContentDocument } from '@frontend/ui-document';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { applySection } from './editing';

export const document: ContentDocument = {
  documentId: 'neutral-roundtrip',
  schemaVersion: 1,
  revision: 7,
  data: {
    root: {},
    content: [
      { type: 'Heading', props: { id: 'title', text: '' } },
      {
        type: 'Row',
        props: {
          id: 'row',
          content: [
            {
              type: 'Grid',
              props: {
                id: 'grid',
                columns: 2,
                content: [
                  { type: 'Heading', props: { id: 'child', text: 'Nested child' } },
                  {
                    type: 'RichText',
                    props: {
                      id: 'body',
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'text', text: 'Editable paragraph' }],
                        },
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
  variables: { content: { title: 'Neutral bound title' } },
  bindings: [{ nodeId: 'title', targetPath: ['text'], sourcePath: ['content', 'title'] }],
};
export async function applyDocument(page: Page, value: unknown = document): Promise<void> {
  await applySection(page, 'document', value);
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeEnabled();
}
