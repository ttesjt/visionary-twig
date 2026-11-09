import { useStudioTextCatalog } from '../text/context.js';
import type { ProjectSession } from './use-project-session.js';
/** Applied working-copy history; staged source text never gets silently discarded by Undo. */
export function StudioSessionHistory({ session }: { readonly session: ProjectSession }) {
  const componentText = useStudioTextCatalog();
  return (
    <div className="ui-studio-actions">
      <button
        className="ui-studio-button"
        type="button"
        disabled={!session.flags.canUndo}
        onClick={() => session.dispatch({ type: 'undo' })}
      >
        {componentText.undo}
      </button>
      <button
        className="ui-studio-button"
        type="button"
        disabled={!session.flags.canRedo}
        onClick={() => session.dispatch({ type: 'redo' })}
      >
        {componentText.redo}
      </button>
    </div>
  );
}
