import type { ReactNode } from 'react';
import { Tabs, TabPanel } from '@frontend/content-blocks';
export function StudioFocusToolbar({
  title,
  back,
  actions,
}: {
  readonly title: string;
  readonly back: ReactNode;
  readonly actions: ReactNode;
}) {
  return (
    <header className="ui-studio-focus-toolbar">
      {back}
      <h1>{title}</h1>
      {actions}
    </header>
  );
}
/** Engines are slots. Switching tabs never unmounts source buffers or the preview. */
export function StudioSourceWorkspace({
  title,
  back,
  actions,
  json,
  preview,
  labels,
}: {
  readonly title: string;
  readonly back: ReactNode;
  readonly actions: ReactNode;
  readonly json: ReactNode;
  readonly preview: ReactNode;
  readonly labels: { readonly tabs: string; readonly json: string; readonly preview: string };
}) {
  return (
    <div className="ui-studio-focus-workspace">
      <StudioFocusToolbar title={title} back={back} actions={actions} />
      <Tabs label={labels.tabs} className="ui-studio-focus-tabs">
        <TabPanel label={labels.json} className="ui-studio-focus-panel">
          {json}
        </TabPanel>
        <TabPanel label={labels.preview} className="ui-studio-focus-panel">
          {preview}
        </TabPanel>
      </Tabs>
    </div>
  );
}
