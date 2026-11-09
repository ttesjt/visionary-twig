'use client';

import {
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { contentClassName, type ContentProps } from '../shared/component-props.js';
import { TabsContext, tabDomId } from './tabs-context.js';
import type { TabPanelData } from './tabs.schema.js';

export type TabPanelProps = TabPanelData & ContentProps & { readonly children?: ReactNode };
export function TabPanel({ label, children, id, className }: TabPanelProps): ReactElement {
  const tabs = useContext(TabsContext);
  const key = useId();
  const panel = useRef<HTMLElement>(null);
  const register = tabs?.register;
  useLayoutEffect(() => {
    const element = panel.current;
    if (element && register) return register({ key, label, element });
  }, [key, label, register]);
  return (
    <section
      ref={panel}
      id={tabs ? tabDomId(tabs.prefix, 'panel', key) : id}
      className={contentClassName('ui-content-tabpanel', className)}
      role={tabs?.enhanced ? 'tabpanel' : undefined}
      aria-labelledby={tabs?.enhanced ? tabDomId(tabs.prefix, 'tab', key) : undefined}
      tabIndex={tabs?.enhanced ? 0 : undefined}
      hidden={tabs?.enhanced && !tabs.editing && tabs.selected !== key}
    >
      {(!tabs?.enhanced || tabs.editing) && <p className="ui-tabpanel-label">{label}</p>}
      {children}
    </section>
  );
}
