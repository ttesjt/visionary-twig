'use client';
import { createContext, useContext, useMemo, type ComponentType, type ReactNode } from 'react';
import type { ContentNavigationData, ContentNavigationItem } from '../content-navigation.schema.js';
import type { ContentReadingState, NavigationPosition } from '../reading-store.js';
import {
  defaultNavigationCatalog,
  resolveNavigationPresentation,
  type NavigationPresentationCatalog,
  type ResolvedNavigationPresentation,
} from './catalog.js';
import {
  NAVIGATION_PARTS,
  DEFAULT_NAVIGATION_PRESENTATION,
  type NavigationPresentation,
} from './presentation.schema.js';
export type NavigationPlacement = 'inline' | 'header' | 'menu' | 'trigger';
export interface NavigationSurfaceState {
  /** Eligibility for subscriptions/side effects; never selects or hides a visual renderer. */
  readonly active: boolean;
  /** Whether the shared surface currently permits interaction. */
  readonly interactive: boolean;
}
export interface NavigationPartProps extends NavigationSurfaceState, NavigationPosition {
  readonly navigation: ContentNavigationData;
  readonly reading: ContentReadingState;
  readonly placement: NavigationPlacement;
  readonly options: unknown;
}
export interface NavigationItemPartProps extends NavigationPartProps {
  readonly item: ContentNavigationItem;
  readonly index: number;
  readonly current: boolean;
}
/** Parts render noninteractive contents; the shared surface owns links and progress semantics. */
export interface NavigationPartComponents {
  readonly title: Readonly<Record<string, ComponentType<NavigationPartProps>>>;
  readonly item: Readonly<Record<string, ComponentType<NavigationItemPartProps>>>;
  readonly progress: Readonly<Record<string, ComponentType<NavigationPartProps>>>;
}
export interface NavigationPresentationRegistry {
  readonly catalog: NavigationPresentationCatalog;
  readonly components: NavigationPartComponents;
}
export function createNavigationPresentationRegistry(
  catalog: NavigationPresentationCatalog,
  components: NavigationPartComponents
): NavigationPresentationRegistry {
  for (const part of NAVIGATION_PARTS) {
    for (const id of Object.keys(catalog.parts[part])) {
      if (id !== DEFAULT_NAVIGATION_PRESENTATION && !Object.hasOwn(components[part], id))
        throw new Error(`Missing navigation ${part} renderer: ${id}`);
    }
    for (const id of Object.keys(components[part])) {
      if (id === DEFAULT_NAVIGATION_PRESENTATION || !Object.hasOwn(catalog.parts[part], id))
        throw new Error(`Unregistered navigation ${part} renderer: ${id}`);
    }
  }
  return { catalog, components };
}
const defaultRegistry: NavigationPresentationRegistry = {
  catalog: defaultNavigationCatalog,
  components: { title: {}, item: {}, progress: {} },
};
const RegistryContext = createContext(defaultRegistry);
export function NavigationPresentationProvider({
  registry,
  children,
}: {
  readonly registry: NavigationPresentationRegistry;
  readonly children: ReactNode;
}) {
  return <RegistryContext value={registry}>{children}</RegistryContext>;
}
const PresentationContext = createContext<ResolvedNavigationPresentation>(
  resolveNavigationPresentation(undefined)
);
export function useNavigationRegistry() {
  return useContext(RegistryContext);
}
export function NavigationPresentationSession({
  presentation,
  registry,
  children,
}: {
  readonly presentation?: NavigationPresentation | undefined;
  readonly registry: NavigationPresentationRegistry;
  readonly children: ReactNode;
}) {
  const resolved = useMemo(
    () => resolveNavigationPresentation(presentation, registry.catalog),
    [presentation, registry]
  );
  return (
    <RegistryContext value={registry}>
      <PresentationContext value={resolved}>{children}</PresentationContext>
    </RegistryContext>
  );
}
export function useNavigationPresentation() {
  return { ...useContext(RegistryContext), ...useContext(PresentationContext) };
}
export function DefaultNavigationTitle({ navigation, placement }: NavigationPartProps) {
  return <>{placement === 'inline' ? navigation.label : (navigation.title ?? navigation.label)}</>;
}
export function DefaultNavigationItem({ item, index }: NavigationItemPartProps) {
  return (
    <>
      <span className="ui-content-navigation-index" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span>{item.label}</span>
    </>
  );
}
/** Missing custom renderers are configuration errors, never a silent neutral fallback. */
export function navigationPartComponent<T>(
  components: Readonly<Record<string, T>>,
  id: string,
  fallback: T
): T {
  if (id === DEFAULT_NAVIGATION_PRESENTATION) return fallback;
  const component = Object.hasOwn(components, id) ? components[id] : undefined;
  if (!component) throw new Error(`Missing navigation part renderer: ${id}`);
  return component;
}

const SurfaceActivityContext = createContext<NavigationSurfaceState>({
  active: true,
  interactive: true,
});
/** Hosts control effect eligibility and interaction independently of the selected visual parts. */
export function NavigationSurfaceActivityProvider({
  active,
  interactive = active,
  children,
}: {
  readonly active: boolean;
  readonly interactive?: boolean;
  readonly children: ReactNode;
}) {
  const state = useMemo(() => ({ active, interactive }), [active, interactive]);
  return <SurfaceActivityContext value={state}>{children}</SurfaceActivityContext>;
}
export function useNavigationSurfaceState(active: boolean): NavigationSurfaceState {
  const host = useContext(SurfaceActivityContext);
  return { active: active && host.active, interactive: active && host.interactive };
}
