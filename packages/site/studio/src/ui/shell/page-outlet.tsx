import { createContext, useContext } from 'react';
import type { StudioPageContext } from './contracts.js';
export const StudioPageScope = createContext<StudioPageContext | undefined>(undefined);
/** Optional host route outlet. The shell also renders this automatically without children. */
export function StudioPageOutlet() {
  const context = useContext(StudioPageScope);
  if (!context) throw new Error('StudioPageOutlet requires a StudioShell.');
  if (context.page.rendering === 'route')
    throw new Error('A route-owned Studio entry requires host route content.');
  const Page = context.page.component;
  return <Page {...context} />;
}
