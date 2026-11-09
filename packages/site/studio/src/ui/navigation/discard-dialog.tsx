import { Dialog } from '@frontend/ui/dialog';
import { DEFAULT_STUDIO_DISCARD_TEXT, type StudioDiscardText } from './text-catalog.js';
import type { StudioNavigationGuard } from './use-navigation-guard.js';
export function StudioDiscardDialog({
  guard,
  text: componentText = DEFAULT_STUDIO_DISCARD_TEXT,
}: {
  readonly guard: StudioNavigationGuard;
  readonly text?: StudioDiscardText;
}) {
  return (
    <Dialog
      open={guard.pending}
      onOpenChange={(open) => {
        if (!open) guard.cancel();
      }}
      title={componentText.title}
      description={componentText.description}
    >
      <div className="ui-studio-actions">
        <button className="ui-studio-button" type="button" onClick={guard.cancel}>
          {componentText.cancel}
        </button>
        <button className="ui-studio-button" type="button" onClick={guard.confirm}>
          {componentText.confirm}
        </button>
      </div>
    </Dialog>
  );
}
