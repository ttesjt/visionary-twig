'use client';
import { useSyncExternalStore } from 'react';
/** Keep aligned with the public compact navigation breakpoint in the content navigation stylesheet. */
const COMPACT_NAVIGATION_QUERY = '(max-width: 48rem)';
function subscribe(listener: () => void) {
  const media = window.matchMedia(COMPACT_NAVIGATION_QUERY);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
function snapshot() {
  return window.matchMedia(COMPACT_NAVIGATION_QUERY).matches;
}
export function useCompactNavigation() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
