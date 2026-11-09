import type { ReactNode } from 'react';
import { Tabs, TabPanel } from '@frontend/content-blocks';
export interface StudioResourceTab {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
}
/** Layout slots preserve mounted panels; hosts own the resource identity, controls and operations. */
export function StudioResourceManager({
  label,
  title,
  back,
  name,
  actions,
  status,
  tabsLabel,
  tabs,
}: {
  readonly label: string;
  readonly title: string;
  readonly back: ReactNode;
  readonly name: ReactNode;
  readonly actions: ReactNode;
  readonly status?: ReactNode;
  readonly tabsLabel: string;
  readonly tabs: readonly StudioResourceTab[];
}) {
  return (
    <section className="ui-studio-resource-manager" aria-label={label}>
      <h1 className="ui-studio-sr-only">{title}</h1>
      <header className="ui-studio-resource-toolbar">
        {back}
        {name}
        <div className="ui-studio-actions ui-studio-resource-actions">{actions}</div>
      </header>
      {status && <div className="ui-studio-resource-status">{status}</div>}
      <Tabs label={tabsLabel} className="ui-studio-resource-tabs">
        {tabs.map((tab) => (
          <TabPanel key={tab.id} label={tab.label} className="ui-studio-resource-panel">
            {tab.content}
          </TabPanel>
        ))}
      </Tabs>
    </section>
  );
}
