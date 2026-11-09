export interface ContentIssue {
  readonly code: string;
  readonly message: string;
  /** Absolute document path, or a path under context for external variables. */
  readonly path: readonly string[];
  readonly documentId?: string;
  readonly nodeId?: string;
}

export type ContentResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly ContentIssue[] };

/** Internal control flow for expected boundary failures; never exposed as a success. */
export class ContentFailure extends Error {
  constructor(readonly issue: ContentIssue) {
    super(issue.message);
  }
}

export function fail(code: string, path: readonly string[], message: string): never {
  throw new ContentFailure({ code, path, message });
}

export function capture<T>(operation: () => T, documentId?: string): ContentResult<T> {
  try {
    return { ok: true, value: operation() };
  } catch (error) {
    if (!(error instanceof ContentFailure)) throw error;
    return {
      ok: false,
      errors: [{ ...error.issue, ...(documentId === undefined ? {} : { documentId }) }],
    };
  }
}
