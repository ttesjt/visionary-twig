import { useSyncExternalStore } from 'react';

const subscribe = (): (() => void) => () => {};
const clientSnapshot = (): boolean => true;
const serverSnapshot = (): boolean => false;

/** SSR exposes all slides; the browser progressively enables carousel controls. */
export function useEnhancement(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
