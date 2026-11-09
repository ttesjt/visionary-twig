import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { RegisteredPanel } from './tabs-context.js';

/** Panels own their labels. Read DOM order so native slot moves never need a parallel metadata list. */
export function useTabPanels(root: RefObject<HTMLElement | null>) {
  const registry = useRef(new Map<string, RegisteredPanel>());
  const [panels, setPanels] = useState<readonly RegisteredPanel[]>([]);
  const synchronize = useCallback((): void => {
    const next = [...registry.current.values()].sort((a, b) => {
      if (a.element === b.element) return 0;
      return a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1;
    });
    setPanels((previous) =>
      previous.length === next.length &&
      previous.every(
        (panel, index) => panel.key === next[index]?.key && panel.label === next[index]?.label
      )
        ? previous
        : next
    );
  }, []);
  const register = useCallback(
    (panel: RegisteredPanel): (() => void) => {
      registry.current.set(panel.key, panel);
      synchronize();
      return () => {
        registry.current.delete(panel.key);
        synchronize();
      };
    },
    [synchronize]
  );
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new MutationObserver(synchronize);
    observer.observe(element, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [root, synchronize]);
  return { panels, register };
}
