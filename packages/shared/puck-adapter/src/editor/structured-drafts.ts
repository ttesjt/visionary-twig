import { useCallback, useEffect, useRef, useState } from 'react';

export interface StructuredDraft {
  readonly id: string;
  readonly nodeId?: string;
  readonly source: string;
  readonly text: string;
  readonly error: string;
  readonly notify?: (id: string, pending: boolean) => void;
}
export interface StructuredDrafts {
  readonly values: ReadonlyMap<string, StructuredDraft>;
  readonly set: (key: string, draft: StructuredDraft | null) => void;
}

/** Invalid field buffers belong to the editor session, not the selected field's
 * mounted lifetime. Native deletion releases only the deleted node's drafts.
 */
export function useStructuredDrafts(nodeIds: ReadonlySet<string>): StructuredDrafts {
  const [values, setValues] = useState<ReadonlyMap<string, StructuredDraft>>(new Map());
  const current = useRef(values);
  const set = useCallback((key: string, draft: StructuredDraft | null) => {
    const previous = current.current.get(key);
    if (!draft && !previous) return;
    const next = new Map(current.current);
    if (draft) next.set(key, draft);
    else next.delete(key);
    current.current = next;
    setValues(next);
    if (previous && (!draft || previous.notify !== draft.notify))
      previous.notify?.(previous.id, false);
    if (draft) draft.notify?.(draft.id, true);
  }, []);
  useEffect(() => {
    for (const [key, draft] of current.current)
      if (draft.nodeId && !nodeIds.has(draft.nodeId)) set(key, null);
  }, [nodeIds, set]);
  useEffect(
    () => () => {
      for (const draft of current.current.values()) draft.notify?.(draft.id, false);
    },
    []
  );
  return { values, set };
}
