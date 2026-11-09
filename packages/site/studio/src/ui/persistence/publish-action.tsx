import { useState, type ReactNode } from 'react';
import { Button } from '@frontend/ui';
import { Dialog } from '@frontend/ui/dialog';
import { useStudioTextCatalog } from '../text/context.js';
export interface StudioPublishActionProps {
  readonly disabled?: boolean;
  readonly busy: boolean;
  readonly onPublish: () => void;
  readonly summary: ReactNode;
  readonly status?: ReactNode;
}
/** Controlled confirmation UI. The resource owns validation, snapshot capture and persistence. */
export function StudioPublishAction({
  disabled,
  busy,
  onPublish,
  summary,
  status,
}: StudioPublishActionProps) {
  const componentText = useStudioTextCatalog();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Button type="button" disabled={disabled} pending={busy} onClick={() => setConfirm(true)}>
        {componentText.publish}
      </Button>
      {status !== undefined && <p role="status">{busy ? componentText.publishBusy : status}</p>}
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title={componentText.publishConfirmTitle}
        description={componentText.publishConfirmBody}
      >
        {summary}
        <div className="ui-studio-actions">
          <Button type="button" onClick={() => setConfirm(false)}>
            {componentText.cancel}
          </Button>
          <Button
            type="button"
            disabled={disabled || busy}
            onClick={() => {
              setConfirm(false);
              onPublish();
            }}
          >
            {componentText.confirmPublish}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
