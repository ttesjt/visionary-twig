import { useCallback, useEffect, useRef, useState } from 'react';
export interface StudioNavigationGuard {
  readonly pending: boolean;
  request(this: void, action: () => void): void;
  cancel(this: void): void;
  confirm(this: void): void;
}
/** Covers explicit actions, ordinary anchors and unload. Host routers own programmatic/history navigation. */
export function useStudioNavigationGuard({
  when,
  navigate,
  allow,
}: {
  readonly when: boolean;
  readonly navigate?: (href: string) => void;
  readonly allow?: (url: URL) => boolean;
}): StudioNavigationGuard {
  const action = useRef<(() => void) | null>(null);
  const [pending, setPending] = useState(false);
  const request = useCallback(
    (next: () => void) => {
      if (!when) {
        next();
        return;
      }
      action.current = next;
      setPending(true);
    },
    [when]
  );
  useEffect(() => {
    if (!when) return;
    const close = (event: BeforeUnloadEvent) => event.preventDefault();
    const click = (event: MouseEvent) => {
      if (
        !navigate ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        (anchor.target && anchor.target !== '_self') ||
        anchor.hasAttribute('download')
      )
        return;
      const url = new URL(anchor.href);
      if (
        (url.origin === location.origin &&
          url.pathname === location.pathname &&
          url.search === location.search) ||
        allow?.(url)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      request(() => navigate(url.href));
    };
    document.addEventListener('click', click, true);
    window.addEventListener('beforeunload', close);
    return () => {
      document.removeEventListener('click', click, true);
      window.removeEventListener('beforeunload', close);
    };
  }, [when, navigate, allow, request]);
  const cancel = () => {
    action.current = null;
    setPending(false);
  };
  return {
    pending,
    request,
    cancel,
    confirm: () => {
      const next = action.current;
      cancel();
      next?.();
    },
  };
}
