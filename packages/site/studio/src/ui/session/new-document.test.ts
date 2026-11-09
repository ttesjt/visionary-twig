import { describe, expect, it } from 'vitest';
import { resolveDocument } from '@frontend/ui-document';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import { newDocument } from './new-document.js';

describe('new local document', () => {
  it('starts with a valid neutral empty Puck tree and independent owned data', () => {
    const first = newDocument('first');
    expect(resolveDocument(first, contentRegistry).ok).toBe(true);
    expect(newDocument('second').data).not.toBe(first.data);
    expect(first).toMatchObject({ documentId: 'first', revision: 1, data: { content: [] } });
  });
});
