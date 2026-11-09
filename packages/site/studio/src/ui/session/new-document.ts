import { CONTENT_SCHEMA_VERSION } from '@frontend/ui-document';
import type { ContentDocument } from '@frontend/ui-document';

export function newDocument(documentId: string): ContentDocument {
  return {
    documentId,
    schemaVersion: CONTENT_SCHEMA_VERSION,
    revision: 1,
    data: { root: {}, content: [] },
  };
}
