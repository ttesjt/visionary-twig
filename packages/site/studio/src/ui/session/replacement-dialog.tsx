import { Button } from '@frontend/ui';
import { Dialog } from '@frontend/ui/dialog';
import type { ProjectSession } from './use-project-session.js';
import { useStudioTextCatalog } from '../text/context.js';
export function StudioReplacementDialog({ session }: { readonly session: ProjectSession }) {
  const componentText = useStudioTextCatalog();
  return (
    <Dialog
      open={session.pending !== null}
      onOpenChange={(open) => {
        if (!open) session.cancelReplacement();
      }}
      title={componentText.replaceTitle}
      description={componentText.replaceDescription}
    >
      <Button type="button" onClick={session.cancelReplacement}>
        {componentText.keepEditing}
      </Button>
      <Button type="button" onClick={session.confirmReplacement}>
        {componentText.discard}
      </Button>
    </Dialog>
  );
}
