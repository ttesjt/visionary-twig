import { DEFAULT_CONTENT_LIMITS, resolveDocument } from '@frontend/ui-document';
import type { ContentRegistry, JsonObject } from '@frontend/ui-document';
import { capture, isJsonObject, snapshotJson } from '@frontend/ui-document/inspection';
import { z } from 'zod';
import { PortfolioDataError } from '../../data-error.js';
import { projectPageIdentitySchema } from '../contracts.js';
import type { PublishedProjectPage } from '../contracts.js';

const publishedPageRowSchema = projectPageIdentitySchema.extend({
  document_json: z.string(),
  context_json: z.string(),
});

function readContext(text: string): JsonObject {
  if (text.length > DEFAULT_CONTENT_LIMITS.maxBytes)
    throw new Error('Publication context exceeds maxBytes.');
  const input: unknown = JSON.parse(text);
  const context = capture(() => snapshotJson(input, DEFAULT_CONTENT_LIMITS));
  if (!context.ok) throw new Error('Invalid publication context.', { cause: context.errors });
  if (!isJsonObject(context.value)) throw new Error('Publication context must be a JSON object.');
  return context.value;
}

export function mapPublishedPageRow(row: unknown, registry: ContentRegistry): PublishedProjectPage {
  try {
    const { document_json, context_json, ...identity } = publishedPageRowSchema.parse(row);
    const context = readContext(context_json);
    const result = resolveDocument(document_json, registry, { context });
    if (!result.ok) throw new Error('Invalid publication document.', { cause: result.errors });
    const { document } = result.value;
    if (document.locale !== undefined && document.locale !== identity.locale)
      throw new Error('Publication language differs from the document language.');
    return { ...identity, document, context };
  } catch (cause) {
    throw new PortfolioDataError(
      'invalid-published-page',
      'Unable to decode a published project page.',
      { cause }
    );
  }
}
