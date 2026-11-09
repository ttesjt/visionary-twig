import { z } from 'zod';
import { parseTextTemplate } from './template.js';
/** Allowed names may be reordered, repeated or omitted by a translation. */
export function textTemplateSchema(variables: readonly string[]) {
  const allowed = new Set(variables);
  return z
    .string()
    .min(1)
    .superRefine((template, context) => {
      try {
        for (const part of parseTextTemplate(template)) {
          if (part.kind === 'variable' && !allowed.has(part.name))
            context.addIssue({ code: 'custom', message: 'Unknown text variable: ' + part.name });
        }
      } catch (error) {
        context.addIssue({
          code: 'custom',
          message: error instanceof Error ? error.message : 'Invalid text template.',
        });
      }
    });
}
