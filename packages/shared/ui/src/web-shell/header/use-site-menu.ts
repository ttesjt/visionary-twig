import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type PointerEventHandler,
  type RefObject,
} from 'react';

type MenuPhase = 'closed' | 'opening' | 'open' | 'closing';

interface SiteMenuState {
  readonly ref: RefObject<HTMLDialogElement | null>;
  readonly phase: MenuPhase;
  readonly expanded: boolean;
  readonly show: () => void;
  readonly hide: () => void;
  readonly setOpen: (open: boolean) => void;
  readonly onPointerDown: PointerEventHandler<HTMLDialogElement>;
  readonly onPointerUp: PointerEventHandler<HTMLDialogElement>;
  readonly onPointerCancel: PointerEventHandler<HTMLDialogElement>;
}

function isBackdrop(event: PointerEvent<HTMLDialogElement>): boolean {
  if (event.target !== event.currentTarget) return false;
  const bounds = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  );
}

/** Keep native modal focus/scroll behavior until the CSS closing transitions finish. */
export function useSiteMenu(): SiteMenuState {
  const ref = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<MenuPhase>('closed');
  const outsidePointer = useRef<number | null>(null);
  const show = useCallback(() => setPhase('opening'), []);
  const hide = useCallback(
    () => setPhase((current) => (current === 'closed' ? current : 'closing')),
    []
  );
  const setOpen = useCallback((open: boolean) => (open ? show() : hide()), [show, hide]);

  useEffect(() => {
    let frame: number | undefined;
    let active = true;
    if (phase === 'opening') {
      // Let showModal paint the initial state before transitioning to the open target.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (active) setPhase('open');
        });
      });
    } else if (phase === 'closing') {
      frame = requestAnimationFrame(() => {
        const transitions = ref.current?.getAnimations?.() ?? [];
        void Promise.allSettled(transitions.map((animation) => animation.finished)).then(() => {
          if (active) setPhase('closed');
        });
      });
    }
    return () => {
      active = false;
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [phase]);

  return {
    ref,
    phase,
    expanded: phase !== 'closed',
    show,
    hide,
    setOpen,
    onPointerDown: (event: PointerEvent<HTMLDialogElement>) => {
      outsidePointer.current = event.button === 0 && isBackdrop(event) ? event.pointerId : null;
    },
    onPointerUp: (event: PointerEvent<HTMLDialogElement>) => {
      if (outsidePointer.current === event.pointerId && isBackdrop(event)) hide();
      outsidePointer.current = null;
    },
    onPointerCancel: () => {
      outsidePointer.current = null;
    },
  };
}
