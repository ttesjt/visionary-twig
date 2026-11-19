'use client';
import { useMemo, useSyncExternalStore } from 'react';
import { assertAppearancePolicy, resolveAppearance, type AppearancePolicy } from './policy';

function appearanceStore<P extends string>(policy: AppearancePolicy<P>) {
  assertAppearancePolicy(policy);
  return {
    subscribe(this: void, onChange: () => void) {
      const root = document.documentElement;
      const observer = new MutationObserver(onChange);
      observer.observe(root, { attributes: true, attributeFilter: ['data-style-preview'] });
      function handleStorage(event: StorageEvent) {
        if (event.storageArea && event.storageArea !== window.localStorage) return;
        if (event.key === policy.storageKey || event.key === null)
          root.setAttribute(
            'data-style-preview',
            resolveAppearance(event.newValue, policy.presets, policy.defaultPreset)
          );
      }
      window.addEventListener('storage', handleStorage);
      return () => {
        observer.disconnect();
        window.removeEventListener('storage', handleStorage);
      };
    },
    read: () =>
      resolveAppearance(
        document.documentElement.getAttribute('data-style-preview'),
        policy.presets,
        policy.defaultPreset
      ),
    set(this: void, preset: P) {
      if (!policy.presets.includes(preset))
        throw new RangeError('Unknown appearance preset: ' + preset);
      document.documentElement.setAttribute('data-style-preview', preset);
      try {
        localStorage.setItem(policy.storageKey, preset);
      } catch {
        /* Apply the preference even when browser storage is unavailable. */
      }
    },
  };
}
/** Pass a stable host policy. SSR reports no browser preference; bootstrap establishes it before paint. */
export function useAppearance<P extends string>(policy: AppearancePolicy<P>) {
  const store = useMemo(() => appearanceStore(policy), [policy]);
  return {
    appearance: useSyncExternalStore(store.subscribe, store.read, () => undefined),
    setAppearance: store.set,
  };
}
