import 'server-only';
import { createPreviewStore } from './preview-store';
import type { PreviewStore } from './preview-store';

declare global {
  var studioPreviewStore: PreviewStore | undefined;
}
// Next can bundle route handlers and RSC pages separately; share one bounded process store.
export const previewStore = (globalThis.studioPreviewStore ??= createPreviewStore());
