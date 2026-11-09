import type { ComponentType, ReactNode } from 'react';

export interface StudioPageGroup {
  readonly id: string;
  readonly label: string;
}
interface StudioPageMetadata {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly group: string;
  readonly icon?: ReactNode;
}
export type StudioPageDefinition = StudioPageMetadata &
  (
    | { readonly rendering?: 'component'; readonly component: ComponentType<StudioPageContext> }
    | { readonly rendering: 'route'; readonly component?: never }
  );
export interface StudioPageContext {
  readonly page: StudioPageDefinition;
  readonly registry: StudioRegistry;
  readonly navigate: (pageId: string) => void;
}
export interface StudioRegistry {
  readonly groups: readonly StudioPageGroup[];
  readonly pages: readonly StudioPageDefinition[];
  readonly findPage: (id: string) => StudioPageDefinition | undefined;
}
export interface StudioNavigation {
  readonly href: (pageId: string) => string;
  readonly navigate: (pageId: string) => void;
}
