import { INLINE_EDITOR_UI } from './inline-viewport.js';
import { useEditorSave, saveMessage } from './use-editor-save.js';
import { useStructuredDrafts } from './structured-drafts.js';
import { applyHistoryShortcut } from './history-shortcut.js';
import { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Puck } from '@puckeditor/core';
import type { Data, PuckAction, AppState } from '@puckeditor/core';
import {
  parseDocument,
  reconcileDocumentEdit,
  resolveDocument,
  unbindDocumentField,
} from '@frontend/ui-document';
import type {
  ContentDocument,
  ContentIssue,
  ContentSaveResult,
  DocumentEditOptions,
  ResolveOptions,
} from '@frontend/ui-document';
import { contentRegistry } from '../registry/content-registry.js';
import { toPuckData } from '../config/puck-data.js';
import { editorConfig } from './editor-config.js';
import { EditorRuntimeContext } from './editor-context.js';
import { HostEditorHeader } from './host-controls.js';
import type { EditorHistoryControls } from './host-controls.js';
import type { EditorFieldRenderer } from './field-contract.js';
import {
  nodeIdAtZone,
  normalizeEditorData,
  previewPropsById,
  restoreNativeHistory,
} from './native-data.js';

export interface ContentEditorSnapshot {
  readonly document: ContentDocument;
  readonly issues: readonly ContentIssue[];
  /** Invalid field drafts are not in document.data; exporting that data would lose visible edits. */
  readonly invalidFieldIds: readonly string[];
  readonly canExport: boolean;
}

export interface ContentEditorProps extends ResolveOptions {
  readonly fieldEditor?: EditorFieldRenderer;
  /** Separates retained field drafts, for example when a host changes editing language. */
  readonly fieldScope?: string | number;
  readonly selectionScope?: string | number;
  readonly historyControls?: EditorHistoryControls;
  readonly document: unknown;
  /** Explicitly starts a new native history, including replacement with the same ID/revision. */
  readonly sessionKey?: string;
  readonly onSnapshotChange?: (snapshot: ContentEditorSnapshot) => void;
  /** Replaces default Save actions; return null to hide them. Must be client-owned. */
  readonly headerActions?: (snapshot: ContentEditorSnapshot) => ReactNode;
  /** Client-owned adapter callback; server functions/credentials do not cross this boundary. */
  readonly onSave?: (document: ContentDocument, signal: AbortSignal) => Promise<ContentSaveResult>;
}

function EditorSession({
  initial,
  onSave,
  onSnapshotChange,
  headerActions,
  fieldEditor,
  fieldScope,
  historyControls,
  context,
  limits,
  selectionMemory,
}: Omit<ContentEditorProps, 'document'> & {
  readonly initial: ContentDocument;
  readonly selectionMemory: { current: string | null };
}) {
  const [document, setDocument] = useState(initial);
  const raw = useRef(document);
  // Puck history keeps immutable Data references. Weak keys follow its history
  // lifetime and pair each native snapshot with the corresponding raw bindings.
  const history = useRef(new WeakMap<Data, ContentDocument>());
  const [editIssues, setEditIssues] = useState<readonly ContentIssue[]>([]);
  const [drafts, setDrafts] = useState<ReadonlySet<string>>(new Set());
  const nodeIds = useMemo(
    () => new Set(['root', ...previewPropsById(document.data).keys()]),
    [document.data]
  );
  const structuredDrafts = useStructuredDrafts(nodeIds);
  const options = useMemo(
    () => ({ context, ...(limits === undefined ? {} : { limits }) }),
    [context, limits]
  );
  const preview = useMemo(
    () => resolveDocument(document, contentRegistry, options),
    [document, options]
  );
  const propsById = useMemo(
    () => (preview.ok ? previewPropsById(preview.value.data) : new Map()),
    [preview]
  );
  const issues = useMemo(
    () => (preview.ok ? editIssues : [...editIssues, ...preview.errors]),
    [preview, editIssues]
  );
  const snapshot = useMemo<ContentEditorSnapshot>(
    () => ({
      document,
      issues,
      invalidFieldIds: [
        ...new Set([...drafts, ...[...structuredDrafts.values.values()].map((draft) => draft.id)]),
      ],
      canExport: !issues.length && !drafts.size && !structuredDrafts.values.size,
    }),
    [document, issues, drafts, structuredDrafts.values]
  );
  const { state: saveState, save } = useEditorSave({
    raw,
    options,
    canExport: snapshot.canExport,
    onSave,
    onDocument: setDocument,
    onIssues: setEditIssues,
  });
  const envelope = (input: ContentDocument) =>
    JSON.stringify({
      documentId: input.documentId,
      schemaVersion: input.schemaVersion,
      revision: input.revision,
      locale: input.locale,
      variables: input.variables,
    });
  const initialEnvelope = envelope(initial);
  const previousEnvelope = useRef(initialEnvelope);
  const externalEnvelopeChanged = previousEnvelope.current !== initialEnvelope;
  useLayoutEffect(() => {
    previousEnvelope.current = initialEnvelope;
    if (
      externalEnvelopeChanged &&
      initialEnvelope !== envelope(raw.current) &&
      JSON.stringify(initial.data) === JSON.stringify(raw.current.data) &&
      JSON.stringify(initial.bindings) === JSON.stringify(raw.current.bindings)
    ) {
      raw.current = initial;
      setDocument(initial);
    }
  }, [initial, initialEnvelope, externalEnvelopeChanged]);
  useEffect(() => {
    // Skip the stale projection only during an external envelope replacement.
    // Internal Save acknowledgements legitimately advance revision before the host updates props.
    if (!externalEnvelopeChanged) onSnapshotChange?.(snapshot);
  }, [onSnapshotChange, snapshot, externalEnvelopeChanged]);
  const draftChanged = useCallback((id: string, invalid: boolean) => {
    setDrafts((current) => {
      if (current.has(id) === invalid) return current;
      const next = new Set(current);
      if (invalid) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const accept = useCallback(
    (data: Data, duplicate?: DocumentEditOptions['duplicate']) => {
      try {
        const normalized = normalizeEditorData(data);
        if (JSON.stringify(normalized) === JSON.stringify(raw.current.data)) {
          history.current.set(data, raw.current);
          setEditIssues([]);
          return;
        }
        const result = reconcileDocumentEdit(raw.current, normalized, contentRegistry, {
          ...(limits === undefined ? {} : { limits }),
          ...(duplicate === undefined ? {} : { duplicate }),
        });
        if (!result.ok) {
          setEditIssues(result.errors);
          return;
        }
        raw.current = result.value;
        history.current.set(data, result.value);
        setDocument(result.value);
        setEditIssues([]);
      } catch {
        setEditIssues([
          {
            code: 'invalid-editor-data',
            path: [],
            message: 'Editor data is not a valid serializable document.',
          },
        ]);
      }
    },
    [limits]
  );

  const onAction = useCallback(
    (action: PuckAction, next: AppState, previous: AppState) => {
      if (next.data === previous.data) return;
      if (!history.current.has(previous.data)) history.current.set(previous.data, raw.current);
      if (action.type === 'set') {
        const restored = history.current.get(next.data);
        if (restored) {
          const updated = restoreNativeHistory(raw.current, restored);
          raw.current = updated;
          setDocument(updated);
          setEditIssues([]);
          return;
        }
      }
      if (action.type === 'duplicate') {
        const sourceNodeId = nodeIdAtZone(previous.data, action.sourceZone, action.sourceIndex);
        const targetNodeId = nodeIdAtZone(next.data, action.sourceZone, action.sourceIndex + 1);
        if (sourceNodeId === undefined || targetNodeId === undefined) {
          setEditIssues([
            {
              code: 'invalid-duplicate',
              path: [],
              message: 'Could not identify duplicated nodes.',
            },
          ]);
          return;
        }
        accept(next.data, { sourceNodeId, targetNodeId });
      } else accept(next.data);
    },
    [accept]
  );

  const unbind = useCallback(
    (nodeId: string, path: readonly string[]) => {
      const result = unbindDocumentField(raw.current, nodeId, path, contentRegistry, options);
      if (result.ok) {
        raw.current = result.value;
        setDocument(result.value);
        setEditIssues([]);
      } else setEditIssues(result.errors);
      return result;
    },
    [options]
  );

  return (
    <EditorRuntimeContext.Provider
      value={{
        document,
        nodeIds,
        structuredDrafts,
        ...(fieldScope === undefined ? {} : { fieldScope }),
        propsById,
        issues,
        unbind,
        draftChanged,
        ...(fieldEditor ? { fieldEditor } : {}),
      }}
    >
      <div
        className="ui-content-editor"
        onKeyDownCapture={(event) => {
          if (historyControls) applyHistoryShortcut(event, historyControls);
        }}
      >
        <p>Preview resolves variables; the original document retains bindings.</p>
        {issues.length > 0 && (
          <div role="alert">
            {issues.map((issue) => (
              <p key={`${issue.code}:${issue.nodeId ?? ''}:${JSON.stringify(issue.path)}`}>
                {issue.code}: {issue.nodeId} {issue.path.join('.')} — {issue.message}
              </p>
            ))}
          </div>
        )}
        {snapshot.invalidFieldIds.length > 0 && (
          <p role="alert">Fix invalid structured fields to use the current document.</p>
        )}
        <p role="status">{saveMessage(saveState, document, snapshot.invalidFieldIds.length > 0)}</p>
        <Puck
          config={editorConfig}
          data={toPuckData(initial.data)}
          iframe={{ enabled: false }}
          ui={INLINE_EDITOR_UI}
          onAction={onAction}
          onChange={accept}
          overrides={{
            ...(historyControls
              ? {
                  header: () => (
                    <HostEditorHeader controls={historyControls} memory={selectionMemory} />
                  ),
                }
              : {}),
            headerActions: () =>
              headerActions ? (
                <>{headerActions(snapshot)}</>
              ) : (
                <button
                  type="button"
                  disabled={saveState.status === 'saving' || !snapshot.canExport || !onSave}
                  onClick={() => {
                    void save();
                  }}
                >
                  Save document
                </button>
              ),
          }}
        />
      </div>
    </EditorRuntimeContext.Provider>
  );
}

export function ContentEditor({
  document,
  sessionKey,
  selectionScope,
  ...props
}: ContentEditorProps): ReactElement {
  const selectionMemory = useRef<string | null>(null);
  const scope = selectionScope ?? sessionKey;
  const previousScope = useRef(scope);
  if (previousScope.current !== scope) {
    previousScope.current = scope;
    selectionMemory.current = null;
  }
  const parsed = parseDocument(document, contentRegistry, props);
  if (!parsed.ok)
    return (
      <div role="alert">
        {parsed.errors.map((issue) => (
          <p key={`${issue.code}:${JSON.stringify(issue.path)}`}>
            {issue.code}: {issue.message}
          </p>
        ))}
      </div>
    );
  return (
    <EditorSession
      key={sessionKey ?? `${parsed.value.documentId}:${parsed.value.revision}`}
      initial={parsed.value}
      selectionMemory={selectionMemory}
      {...props}
    />
  );
}
