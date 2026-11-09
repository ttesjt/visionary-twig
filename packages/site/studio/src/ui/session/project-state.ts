import { DEFAULT_PROJECT_FILENAME } from './session-constants.js';
import type { ContentIssue } from '@frontend/ui-document';
import {
  createProject,
  createProjectHistory,
  commitProject,
  undoProject,
  redoProject,
  projectFingerprint,
  contentFingerprint,
} from '../../data/index.js';
import type { StudioProject, ProjectHistory, PublicationTarget } from '../../data/index.js';
export interface ProjectSessionState {
  readonly generation: number;
  readonly editorEpoch: number;
  readonly history: ProjectHistory;
  readonly associations: StudioProject['publishing'];
  readonly filename: string;
  readonly opened: string;
  readonly saved: string | null;
  readonly published: string | null;
  readonly locale: string;
  readonly issues: readonly ContentIssue[];
  readonly drafts: ReadonlySet<string>;
}
export function sessionProject(state: ProjectSessionState): StudioProject {
  const project = { ...state.history.present };
  delete project.publishing;
  return {
    ...project,
    ...(state.associations === undefined ? {} : { publishing: state.associations }),
  };
}
export function createProjectSession(
  project = createProject('untitled'),
  generation = 0
): ProjectSessionState {
  return {
    generation,
    editorEpoch: 0,
    history: createProjectHistory(project),
    associations: project.publishing,
    filename: DEFAULT_PROJECT_FILENAME,
    opened: projectFingerprint(project),
    saved: null,
    published: null,
    locale: project.metadata.defaultLocale,
    issues: [],
    drafts: new Set(),
  };
}
export type ProjectSessionAction =
  | { readonly type: 'commit'; readonly project: StudioProject; readonly fromEditor?: boolean }
  | { readonly type: 'undo' | 'redo' }
  | { readonly type: 'locale'; readonly locale: string }
  | { readonly type: 'issues'; readonly issues: readonly ContentIssue[] }
  | { readonly type: 'draft'; readonly id: string; readonly pending: boolean }
  | {
      readonly type: 'replace';
      readonly project: StudioProject;
      readonly filename: string;
      readonly saved?: boolean;
      readonly generation: number;
      readonly published?: boolean;
    }
  | {
      readonly type: 'saved';
      readonly generation: number;
      readonly project: StudioProject;
      readonly filename?: string;
    }
  | {
      readonly type: 'published';
      readonly generation: number;
      readonly project: StudioProject;
      readonly target: PublicationTarget;
    }
  | { readonly type: 'target'; readonly target: PublicationTarget };
export function projectSessionReducer(
  state: ProjectSessionState,
  action: ProjectSessionAction
): ProjectSessionState {
  switch (action.type) {
    case 'commit': {
      const history = commitProject(state.history, action.project);
      if (history === state.history) return state;
      return {
        ...state,
        associations: action.project.publishing,
        history,
        editorEpoch:
          state.editorEpoch +
          (!action.fromEditor &&
          JSON.stringify({
            data: state.history.present.document.data,
            bindings: state.history.present.document.bindings,
          }) !==
            JSON.stringify({
              data: action.project.document.data,
              bindings: action.project.document.bindings,
            })
            ? 1
            : 0),
        issues: [],
      };
    }
    case 'undo':
    case 'redo': {
      const history =
        action.type === 'undo' ? undoProject(state.history) : redoProject(state.history);
      return history === state.history
        ? state
        : { ...state, history, editorEpoch: state.editorEpoch + 1, issues: [], drafts: new Set() };
    }
    case 'locale':
      return { ...state, locale: action.locale };
    case 'issues':
      return { ...state, issues: action.issues };
    case 'draft': {
      if (state.drafts.has(action.id) === action.pending) return state;
      const drafts = new Set(state.drafts);
      if (action.pending) drafts.add(action.id);
      else drafts.delete(action.id);
      return { ...state, drafts };
    }
    case 'replace': {
      const next = createProjectSession(action.project, action.generation);
      return {
        ...next,
        filename: action.filename,
        saved: action.saved ? projectFingerprint(action.project) : null,
        published: action.published ? contentFingerprint(action.project) : null,
      };
    }
    case 'saved':
      return action.generation !== state.generation
        ? state
        : {
            ...state,
            filename: action.filename ?? state.filename,
            saved: projectFingerprint(action.project),
          };
    case 'published': {
      if (action.generation !== state.generation) return state;
      return {
        ...state,
        published: contentFingerprint(action.project),
        associations: { ...state.associations, target: action.target },
      };
    }
    case 'target':
      return { ...state, associations: { ...state.associations, target: action.target } };
  }
}
export function projectSessionFlags(state: ProjectSessionState) {
  const project = sessionProject(state);
  const fingerprint = projectFingerprint(project);
  const needsSave = state.saved !== fingerprint;
  return {
    needsSave,
    // Retained for the original workbench consumers; storage-neutral consumers use needsSave.
    localDirty: needsSave,
    unpublished: state.published !== contentFingerprint(project),
    hasChanges: fingerprint !== (state.saved ?? state.opened) || state.drafts.size > 0,
    canSave: state.drafts.size === 0,
    canUndo: state.history.past.length > 0 && state.drafts.size === 0,
    canRedo: state.history.future.length > 0 && state.drafts.size === 0,
  };
}
