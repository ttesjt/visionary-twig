import type { StudioProject } from '../project/schema.js';
import { MAX_PROJECT_HISTORY } from '../project/schema.js';
import { projectFingerprint } from '../project/parse.js';
export interface ProjectHistory {
  readonly past: readonly StudioProject[];
  readonly present: StudioProject;
  readonly future: readonly StudioProject[];
}
export const createProjectHistory = (project: StudioProject): ProjectHistory => ({
  past: [],
  present: project,
  future: [],
});
export function commitProject(history: ProjectHistory, project: StudioProject): ProjectHistory {
  if (projectFingerprint(history.present) === projectFingerprint(project)) return history;
  return {
    past: [...history.past, history.present].slice(-MAX_PROJECT_HISTORY),
    present: project,
    future: [],
  };
}
export function undoProject(history: ProjectHistory): ProjectHistory {
  const previous = history.past.at(-1);
  return previous
    ? {
        past: history.past.slice(0, -1),
        present: previous,
        future: [history.present, ...history.future],
      }
    : history;
}
export function redoProject(history: ProjectHistory): ProjectHistory {
  const next = history.future[0];
  return next
    ? { past: [...history.past, history.present], present: next, future: history.future.slice(1) }
    : history;
}
