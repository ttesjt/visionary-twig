import { DEFAULT_PROJECT_FILENAME } from './session-constants.js';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import type { ContentResult, ContentIssue } from '@frontend/ui-document';
import type { ContentEditorSnapshot } from '@frontend/puck-adapter/editor';
import { normalizePuckInput } from '@frontend/puck-adapter/schema';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import {
  importProject,
  parseProject,
  createProject,
  projectContext,
  projectIssues,
  projectFingerprint,
  contentFingerprint,
} from '../../data/index.js';
import type { StudioProject, PublicationTarget } from '../../data/index.js';
import {
  createProjectSession,
  projectSessionReducer,
  sessionProject,
  projectSessionFlags,
} from './project-state.js';
export interface ProjectReplacement {
  readonly project: StudioProject;
  readonly filename: string;
  readonly saved?: boolean;
  readonly published?: boolean;
}
interface PendingReplacement extends ProjectReplacement {
  readonly generation: number;
}
export interface ProjectSessionOptions {
  /** Resource hosts retain their own publication identity across imports/content replacement. */
  readonly associations?: 'file' | 'host';
  /** Establish an initial remote publication baseline without implying a local file save. */
  readonly published?: boolean;
}
export function useProjectSession(
  initialProject?: StudioProject,
  options: ProjectSessionOptions = {}
) {
  const [state, dispatch] = useReducer(projectSessionReducer, undefined, () => {
    const initial = createProjectSession(initialProject);
    return {
      ...initial,
      published: options.published ? contentFingerprint(sessionProject(initial)) : null,
    };
  });
  const project = sessionProject(state);
  const flags = projectSessionFlags(state);
  const [pending, setPending] = useState<PendingReplacement | null>(null);
  const latest = useRef({ state, project, flags });
  const nextGeneration = useRef(0);
  useLayoutEffect(() => {
    latest.current = { state, project, flags };
  });
  const associationPolicy = options.associations ?? 'file';
  const preserveAssociations = useCallback(
    (incoming: StudioProject): StudioProject => {
      if (associationPolicy !== 'host') return incoming;
      const { publishing: ignored, ...content } = incoming;
      void ignored;
      const publishing = latest.current.project.publishing;
      return { ...content, ...(publishing === undefined ? {} : { publishing }) };
    },
    [associationPolicy]
  );
  const run = useCallback(
    (result: ContentResult<StudioProject>, fromEditor = false) => {
      if (!result.ok) {
        dispatch({ type: 'issues', issues: result.errors });
        return false;
      }
      dispatch({ type: 'commit', project: preserveAssociations(result.value), fromEditor });
      return true;
    },
    [preserveAssociations]
  );
  const setDraft = useCallback(
    (id: string, pending: boolean) => dispatch({ type: 'draft', id, pending }),
    []
  );
  const requestReplace = useCallback(
    (replacement: ProjectReplacement) => {
      const project = preserveAssociations(replacement.project);
      const next = {
        ...replacement,
        project,
        saved: Boolean(
          replacement.saved &&
          projectFingerprint(project) === projectFingerprint(replacement.project)
        ),
        generation: ++nextGeneration.current,
      };
      if (latest.current.flags.hasChanges) setPending(next);
      else {
        dispatch({ type: 'replace', ...next });
        setPending(null);
      }
      return next.generation;
    },
    [preserveAssociations]
  );
  const open = useCallback(
    (
      input: unknown,
      options: Omit<ProjectReplacement, 'project'> & { readonly context?: unknown }
    ) => {
      const result = importProject(input, contentRegistry, {
        locale: latest.current.state.locale,
        context: options.context,
        documentId: crypto.randomUUID(),
        normalizePuck: normalizePuckInput,
      });
      if (!result.ok) {
        dispatch({ type: 'issues', issues: result.errors });
        return false;
      }
      let complete = false;
      try {
        const decoded: unknown = typeof input === 'string' ? JSON.parse(input) : input;
        complete =
          decoded !== null && typeof decoded === 'object' && Object.hasOwn(decoded, 'metadata');
      } catch {
        complete = false;
      }
      return requestReplace({
        project: result.value,
        ...options,
        saved: Boolean(options.saved && complete),
      });
    },
    [requestReplace]
  );
  const onSnapshot = useCallback(
    (snapshot: ContentEditorSnapshot) => {
      const current = latest.current;
      if (
        current.state.generation !== state.generation ||
        current.state.editorEpoch !== state.editorEpoch
      )
        return;
      dispatch({ type: 'draft', id: 'puck-fields', pending: snapshot.invalidFieldIds.length > 0 });
      if (JSON.stringify(snapshot.document) !== JSON.stringify(current.project.document))
        run(
          parseProject({ ...current.project, document: snapshot.document }, contentRegistry),
          true
        );
    },
    [run, state.generation, state.editorEpoch]
  );
  useEffect(() => {
    if (!flags.hasChanges) return;
    const protect = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [flags.hasChanges]);
  const errors = projectIssues(project, contentRegistry, state.locale);
  return {
    state,
    project,
    flags,
    latest,
    dispatch,
    run,
    open,
    requestReplace,
    acknowledgeSave: (snapshot: StudioProject, generation: number, filename?: string) =>
      dispatch({ type: 'saved', project: snapshot, generation, ...(filename ? { filename } : {}) }),
    acknowledgePublication: (
      snapshot: StudioProject,
      generation: number,
      target: PublicationTarget
    ) => dispatch({ type: 'published', project: snapshot, generation, target }),
    onSnapshot,
    setDraft,
    pending,
    context: projectContext(project, state.locale),
    errors,
    setIssues: (issues: readonly ContentIssue[]) => dispatch({ type: 'issues', issues }),
    newProject: () =>
      requestReplace({
        project: createProject(crypto.randomUUID(), state.locale),
        filename: DEFAULT_PROJECT_FILENAME,
      }),
    confirmReplacement: () => {
      if (pending) {
        const project = preserveAssociations(pending.project);
        dispatch({
          type: 'replace',
          ...pending,
          project,
          saved: Boolean(
            pending.saved && projectFingerprint(project) === projectFingerprint(pending.project)
          ),
        });
        setPending(null);
      }
    },
    cancelReplacement: () => setPending(null),
  };
}
export type ProjectSession = ReturnType<typeof useProjectSession>;
