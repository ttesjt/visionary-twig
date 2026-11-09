import type { EditorHistoryControls } from '@frontend/puck-adapter/editor';
import type { StudioTextCatalog } from '../text-catalog.js';
import type { ProjectSession } from './use-project-session.js';
export function projectHistoryControls(
  session: ProjectSession,
  componentText: StudioTextCatalog
): EditorHistoryControls {
  return {
    canUndo: session.flags.canUndo,
    canRedo: session.flags.canRedo,
    undo: () => session.dispatch({ type: 'undo' }),
    redo: () => session.dispatch({ type: 'redo' }),
    undoLabel: componentText.undo,
    redoLabel: componentText.redo,
    blocksLabel: componentText.blocks,
    fieldsLabel: componentText.fields,
  };
}
