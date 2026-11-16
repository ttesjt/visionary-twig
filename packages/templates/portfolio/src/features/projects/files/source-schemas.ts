import { parseDocument } from '@frontend/ui-document';
import { projectPageRegistry } from '@frontend/portfolio/render';
import { validateContentTextReferences } from '../../../infra/content-text-reference.ts';
import { projectFilePageSchema } from './schemas.ts';

/** Validate raw references and the document while preserving its authored bindings. */
export function projectFilePageSourceSchemaFor(slug: string): typeof projectFilePageSchema {
  return projectFilePageSchema
    .superRefine(validateContentTextReferences)
    .superRefine((page, context) => {
      const result = parseDocument(page.document, projectPageRegistry);
      if (!result.ok) {
        for (const error of result.errors)
          context.addIssue({
            code: 'custom',
            message: error.message,
            path: ['document', ...error.path],
          });
      } else if (result.value.documentId !== slug) {
        context.addIssue({
          code: 'custom',
          message: 'Document identity differs from its registered project.',
          path: ['document', 'documentId'],
        });
      }
    });
}
