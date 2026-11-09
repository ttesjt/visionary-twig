import type { StructuredDrafts } from './structured-drafts.js';
import type { EditorFieldRenderer } from './field-contract.js';
import { createContext, useContext } from 'react';
import type {
  ContentDocument,
  ContentIssue,
  ContentResult,
  JsonObject,
} from '@frontend/ui-document';

export interface EditorRuntime {
  readonly nodeIds: ReadonlySet<string>;
  readonly fieldScope?: string | number;
  readonly structuredDrafts?: StructuredDrafts;
  readonly fieldEditor?: EditorFieldRenderer;
  readonly document: ContentDocument;
  readonly propsById: ReadonlyMap<string, JsonObject>;
  readonly issues: readonly ContentIssue[];
  readonly unbind: (nodeId: string, path: readonly string[]) => ContentResult<ContentDocument>;
  readonly draftChanged: (id: string, invalid: boolean) => void;
}
export const EditorRuntimeContext = createContext<EditorRuntime | null>(null);
export function useEditorRuntime(): EditorRuntime {
  const runtime = useContext(EditorRuntimeContext);
  if (!runtime) throw new Error('Content editor field requires an editor session.');
  return runtime;
}
