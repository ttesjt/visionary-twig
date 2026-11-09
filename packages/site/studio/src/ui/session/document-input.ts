import type { ContentResult } from '@frontend/ui-document';
export function inputFailure(code: string, message: string): ContentResult<never> {
  return { ok: false, errors: [{ code, path: [], message }] };
}
