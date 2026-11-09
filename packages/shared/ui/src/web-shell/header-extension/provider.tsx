'use client';

import { createContext, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { HeaderExtensionRegistry } from './registry.js';

export const HeaderExtensionContext = createContext<HeaderExtensionRegistry | null>(null);
export interface HeaderExtensionProviderProps {
  /** Host-owned route/resource identity. A changed scope gets an empty, independent slot. */
  readonly scope: string;
  readonly children: ReactNode;
}
export function HeaderExtensionProvider({ scope, children }: HeaderExtensionProviderProps) {
  const registry = useMemo(() => new HeaderExtensionRegistry(scope), [scope]);
  useLayoutEffect(() => () => registry.clear(), [registry]);
  return <HeaderExtensionContext value={registry}>{children}</HeaderExtensionContext>;
}
