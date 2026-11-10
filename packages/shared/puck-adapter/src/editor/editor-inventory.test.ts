import { expect, it, vi } from 'vitest';
// Inventory checks do not mount DnD; the native DOM runtime is exercised in Chromium.
vi.mock('@puckeditor/core', () => ({
  createUsePuck: () => () => {
    throw new Error('Native field subscriptions require a browser.');
  },
}));
import { resolveDocument } from '@frontend/ui-document';
import { editorConfig } from './editor-config.js';
import { editorDefaults } from './defaults.js';
import { contentRegistry } from '../registry/content-registry.js';
import { DOCUMENT_COMPONENT_NAMES } from '../registry/catalog.js';
import { previewPropsById } from './native-data.js';

it('provides editor registrations for every current document component', () => {
  expect(Object.keys(editorConfig.components)).toEqual(DOCUMENT_COMPONENT_NAMES);
  expect(Object.keys(editorDefaults)).toEqual(expect.arrayContaining(DOCUMENT_COMPONENT_NAMES));
});
for (const type of ['Anchor', 'Reveal', 'ScrollBoundary', 'ContentNavigation'] as const) {
  it(`creates a valid ${type} starting document, including required nested slots`, () => {
    const document = {
      documentId: 'starting-document',
      schemaVersion: 1,
      revision: 1,
      data: {
        root: {},
        content: [{ type, props: { id: 'new-node', ...editorDefaults[type] } }],
      },
    };
    const result = resolveDocument(document, contentRegistry);
    expect(result.ok ? [] : result.errors).toEqual([]);
    if (!result.ok) return;
    const props = previewPropsById(result.value.data);
    expect(props.has('new-node')).toBe(true);
    if (type === 'ContentNavigation') expect(props.has('section-anchor')).toBe(true);
  });
}
