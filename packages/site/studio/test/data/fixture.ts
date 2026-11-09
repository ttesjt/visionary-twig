import type { ContentRegistry } from '@frontend/ui-document';
import { createProject } from '../../src/data/project/import.js';
import type { StudioProject } from '../../src/data/project/schema.js';
export const registry: ContentRegistry = {
  nodes: {
    Title: {
      isBindingTarget: (path) => path.length === 1 && path[0] === 'text',
      validateProps: (props) =>
        typeof props.text === 'string' ? [] : [{ path: ['text'], message: 'Expected text.' }],
    },
    Layout: {
      slots: [{ path: ['content'] }],
      isBindingTarget: () => false,
      validateProps: () => [],
    },
  },
};
export function project(): StudioProject {
  return {
    ...createProject('neutral-project'),
    document: {
      documentId: 'neutral-project',
      schemaVersion: 1,
      revision: 3,
      data: {
        root: {},
        content: [
          {
            type: 'Layout',
            props: { id: 'layout', content: [{ type: 'Title', props: { id: 'title', text: '' } }] },
          },
        ],
      },
      bindings: [{ nodeId: 'title', targetPath: ['text'], sourcePath: ['copy', 'hero', 'title'] }],
    },
    catalogs: { en: { hero: { title: 'A quiet place' } }, zh: { hero: { title: '安静的地方' } } },
  };
}
