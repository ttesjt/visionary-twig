'use client';

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useEnhancement } from '../media-gallery/use-enhancement.js';
import { contentClassName, type ContentProps } from '../shared/component-props.js';
import type { TabsData } from './tabs.schema.js';
import { TabsContext, tabDomId } from './tabs-context.js';
import { useTabPanels } from './use-tab-panels.js';

export type TabsProps = TabsData &
  ContentProps & { readonly children?: ReactNode; readonly editing?: boolean };
export function Tabs({ label, children, editing = false, id, className }: TabsProps): ReactElement {
  const prefix = useId();
  const root = useRef<HTMLElement>(null);
  const { panels, register } = useTabPanels(root);
  const [requested, setRequested] = useState<string | undefined>(undefined);
  const enhanced = useEnhancement();
  const selected = panels.some((panel) => panel.key === requested) ? requested : panels[0]?.key;
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    let target: number;
    switch (event.key) {
      case 'ArrowRight':
        target = (index + 1) % panels.length;
        break;
      case 'ArrowLeft':
        target = (index - 1 + panels.length) % panels.length;
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = panels.length - 1;
        break;
      default:
        return;
    }
    const next = panels[target];
    if (!next) return;
    event.preventDefault();
    setRequested(next.key);
    document.getElementById(tabDomId(prefix, 'tab', next.key))?.focus();
  };
  return (
    <TabsContext value={{ prefix, selected, enhanced, editing, register }}>
      <section
        ref={root}
        id={id}
        className={contentClassName('ui-content-tabs', className)}
        aria-label={label}
        data-enhanced={enhanced}
      >
        <div
          className="ui-content-tablist"
          role="tablist"
          aria-label={label}
          hidden={!enhanced || panels.length === 0}
        >
          {panels.map((panel, index) => (
            <button
              key={panel.key}
              type="button"
              className="ui-content-tab"
              role="tab"
              id={tabDomId(prefix, 'tab', panel.key)}
              aria-controls={tabDomId(prefix, 'panel', panel.key)}
              aria-selected={selected === panel.key}
              tabIndex={selected === panel.key ? 0 : -1}
              onClick={() => setRequested(panel.key)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {panel.label}
            </button>
          ))}
        </div>
        {children}
      </section>
    </TabsContext>
  );
}
