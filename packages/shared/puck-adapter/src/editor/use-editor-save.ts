import { useEffect, useRef, useState, type RefObject } from 'react';
import { resolveDocument } from '@frontend/ui-document';
import type {
  ContentDocument,
  ContentRegistry,
  ContentIssue,
  ContentSaveResult,
  ResolveOptions,
} from '@frontend/ui-document';

export type SaveState =
  | { readonly status: 'idle' | 'saving' }
  | { readonly status: 'finished'; readonly message: string }
  | { readonly status: 'saved'; readonly document: ContentDocument };

export function saveMessage(
  state: SaveState,
  document: ContentDocument,
  invalidDraft: boolean
): string {
  if (state.status === 'saving') return 'Saving…';
  if (state.status === 'finished') return state.message;
  if (state.status === 'saved') {
    // Edits may continue during I/O; acknowledge only the snapshot actually submitted.
    const unsaved = invalidDraft || JSON.stringify(document) !== JSON.stringify(state.document);
    return `Saved revision ${state.document.revision}.${unsaved ? ' Newer edits are not saved.' : ''}`;
  }
  return `Revision ${document.revision}`;
}

export function useEditorSave({
  raw,
  registry,
  options,
  canExport,
  onSave,
  onDocument,
  onIssues,
}: {
  readonly raw: RefObject<ContentDocument>;
  readonly registry: ContentRegistry;
  readonly options: ResolveOptions;
  readonly canExport: boolean;
  readonly onSave:
    ((document: ContentDocument, signal: AbortSignal) => Promise<ContentSaveResult>) | undefined;
  readonly onDocument: (document: ContentDocument) => void;
  readonly onIssues: (issues: readonly ContentIssue[]) => void;
}) {
  const saving = useRef<AbortController | null>(null);
  const [state, setState] = useState<SaveState>({ status: 'idle' });
  useEffect(() => () => saving.current?.abort(), []);
  async function save(): Promise<void> {
    if (saving.current || state.status === 'saving' || !canExport) return;
    const validated = resolveDocument(raw.current, registry, options);
    if (!validated.ok) {
      onIssues(validated.errors);
      return;
    }
    if (!onSave) {
      setState({
        status: 'finished',
        message: 'Saving is unavailable: configure a host Sink.',
      });
      return;
    }
    setState({ status: 'saving' });
    const controller = new AbortController();
    saving.current = controller;
    try {
      const result = await onSave(validated.value.document, controller.signal);
      if (controller.signal.aborted) return;
      if (result.status === 'saved') {
        const updated = { ...raw.current, revision: result.version.revision };
        raw.current = updated;
        onDocument(updated);
        setState({
          status: 'saved',
          document: { ...validated.value.document, revision: result.version.revision },
        });
      } else if (result.status === 'invalid') {
        onIssues(result.errors);
        setState({ status: 'finished', message: 'Content could not be validated.' });
      } else
        setState({
          status: 'finished',
          message:
            result.status === 'conflict'
              ? 'Version conflict. Reload the current document before saving.'
              : `Save ${result.status}.`,
        });
    } catch {
      if (controller.signal.aborted) return;
      setState({
        status: 'finished',
        message: 'Save failed. Check the current version before retrying.',
      });
    } finally {
      if (saving.current === controller) saving.current = null;
    }
  }

  return { state, save };
}
