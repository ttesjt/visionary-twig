'use client';
import { createContext, type ComponentType, type ReactNode } from 'react';
export interface NavigationDockProps {
  readonly resourceKey: string;
  readonly children: ReactNode;
  readonly bottom: ReactNode;
}
export interface NavigationMenuProps {
  readonly trigger: ReactNode;
  readonly label: string;
  readonly children: ReactNode;
}
/** Host-owned geometry and docking. This package knows no site Header or DOM selectors. */
export interface ContentNavigationIntegration {
  readonly Dock: ComponentType<NavigationDockProps>;
  readonly Menu?: ComponentType<NavigationMenuProps>;
  readonly geometry: (origin: HTMLElement) => {
    readonly boundaryOffset: number;
    readonly readingOffset: number;
    readonly releaseOffset: number;
    readonly observedElements: readonly Element[];
  };
}
export const ContentNavigationIntegrationContext =
  createContext<ContentNavigationIntegration | null>(null);
export function ContentNavigationIntegrationProvider({
  integration,
  children,
}: {
  readonly integration: ContentNavigationIntegration;
  readonly children: ReactNode;
}) {
  return (
    <ContentNavigationIntegrationContext value={integration}>
      {children}
    </ContentNavigationIntegrationContext>
  );
}
