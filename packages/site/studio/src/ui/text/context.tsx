import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_STUDIO_TEXT, type StudioTextCatalog } from '../text-catalog.js';
export const StudioTextCatalogContext = createContext(DEFAULT_STUDIO_TEXT);
export function useStudioTextCatalog() {
  return useContext(StudioTextCatalogContext);
}

export function StudioTextCatalogProvider({
  text: componentText = DEFAULT_STUDIO_TEXT,
  children,
}: {
  readonly text?: StudioTextCatalog;
  readonly children: ReactNode;
}) {
  return <StudioTextCatalogContext value={componentText}>{children}</StudioTextCatalogContext>;
}
