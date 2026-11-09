'use client';
import type { ContentNavigationData } from './content-navigation.schema.js';
import { createContext, useContext, useSyncExternalStore } from 'react';
export interface ContentReadingState {
  readonly href: string;
  readonly progress: number;
}
export interface NavigationPosition {
  readonly currentIndex: number;
  readonly itemCount: number;
}
export function navigationPosition(
  navigation: ContentNavigationData,
  reading: ContentReadingState
): NavigationPosition {
  return {
    currentIndex: Math.max(
      0,
      navigation.items.findIndex((item) => item.href === reading.href)
    ),
    itemCount: navigation.items.length,
  };
}
export interface ReadingStore {
  readonly snapshot: () => ContentReadingState;
  readonly serverSnapshot: () => ContentReadingState;
  readonly subscribe: (listener: () => void) => () => void;
  readonly publish: (value: ContentReadingState) => void;
}
export function createReadingStore(href: string): ReadingStore {
  const initial = { href, progress: 0 };
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    snapshot: () => value,
    serverSnapshot: () => initial,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish: (next) => {
      if (value.href === next.href && value.progress === next.progress) return;
      value = next;
      for (const listener of listeners) listener();
    },
  };
}
export const ContentReadingContext = createContext<ReadingStore | null>(null);
export function useContentReading(): ContentReadingState {
  const store = useContext(ContentReadingContext);
  if (!store) throw new Error('useContentReading requires ContentNavigation.');
  return useSyncExternalStore(store.subscribe, store.snapshot, store.serverSnapshot);
}
