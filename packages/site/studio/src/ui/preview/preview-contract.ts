import type { ContentDocument, ContentIssue, ResolveOptions } from '@frontend/ui-document';
import type { StudioTheme } from './preview-options.js';
export interface StudioPreviewInput extends Pick<ResolveOptions, 'context'> {
  readonly document: ContentDocument;
  readonly theme: StudioTheme;
}
export type StudioPreviewResult =
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly errors: readonly ContentIssue[] };
/** Client-owned host transport. Returned URLs load the real renderer in an isolated frame. */
export type StudioPreviewAdapter = (
  input: StudioPreviewInput,
  signal: AbortSignal
) => Promise<StudioPreviewResult>;
