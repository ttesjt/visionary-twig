import { capture, assertSafePath, fail } from '@frontend/ui-document/inspection';
import { DEFAULT_CONTENT_LIMITS, type ContentResult } from '@frontend/ui-document';
export function parseVariablePath(text: string): ContentResult<readonly string[]> {
  return capture(() => {
    let value: unknown;
    if (text.trim().startsWith('[')) {
      try {
        value = JSON.parse(text);
      } catch {
        fail('invalid-path', [], 'Enter a dot path or JSON string array.');
      }
    } else value = text.trim().split('.');
    if (!Array.isArray(value) || !value.every((part: unknown) => typeof part === 'string'))
      fail('invalid-path', [], 'Path must contain string segments.');
    const path: string[] = value;
    if (path.length > DEFAULT_CONTENT_LIMITS.maxPathSegments)
      fail('path-too-long', [], 'Path exceeds maxPathSegments.');
    assertSafePath(path, path);
    return path;
  });
}
export function formatVariablePath(path: readonly string[]): string {
  return path.some((segment) => /[.\s\[\]]/u.test(segment)) ? JSON.stringify(path) : path.join('.');
}
