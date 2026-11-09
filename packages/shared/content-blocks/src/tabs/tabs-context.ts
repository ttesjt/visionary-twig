import { createContext } from 'react';

export interface RegisteredPanel {
  readonly key: string;
  readonly label: string;
  readonly element: HTMLElement;
}
export interface TabsContextValue {
  readonly prefix: string;
  readonly selected: string | undefined;
  readonly enhanced: boolean;
  readonly editing: boolean;
  readonly register: (panel: RegisteredPanel) => () => void;
}
export const TabsContext = createContext<TabsContextValue | undefined>(undefined);
export function tabDomId(prefix: string, kind: 'tab' | 'panel', key: string): string {
  return `${prefix}-${kind}-${encodeURIComponent(key)}`;
}
