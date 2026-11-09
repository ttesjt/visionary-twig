import {
  useRef,
  useState,
  type PointerEvent,
  type MouseEvent,
  type RefObject,
  type DragEvent,
} from 'react';

export const STRIP_DRAG_THRESHOLD_PX = 5;
interface DragOrigin {
  readonly x: number;
  readonly left: number;
  readonly pointer: number;
}
/** Touch/trackpad retain native scrolling. Only mouse drags past the threshold suppress clicks. */
export function useStripDrag(enabled: boolean, track: RefObject<HTMLUListElement | null>) {
  const origin = useRef<DragOrigin | undefined>(undefined);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const stop = (): void => {
    origin.current = undefined;
    setDragging(false);
  };
  return {
    'data-dragging': dragging || undefined,
    onPointerDown: (event: PointerEvent<HTMLUListElement>): void => {
      suppressClick.current = false;
      if (!enabled || event.pointerType !== 'mouse' || event.button !== 0) return;
      origin.current = {
        x: event.clientX,
        left: event.currentTarget.scrollLeft,
        pointer: event.pointerId,
      };
    },
    onPointerMove: (event: PointerEvent<HTMLUListElement>): void => {
      const start = origin.current;
      if (!start || !enabled || start.pointer !== event.pointerId) return;
      const delta = event.clientX - start.x;
      if (Math.abs(delta) < STRIP_DRAG_THRESHOLD_PX && !suppressClick.current) return;
      event.preventDefault();
      suppressClick.current = true;
      setDragging(true);
      if (!event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.scrollLeft = start.left - delta;
    },
    onPointerUp: stop,
    onPointerCancel: stop,
    onLostPointerCapture: stop,
    onPointerLeave: (): void => {
      if (!suppressClick.current) stop();
    },
    onClickCapture: (event: MouseEvent<HTMLUListElement>): void => {
      if (suppressClick.current && event.detail !== 0) {
        event.preventDefault();
        event.stopPropagation();
      }
      suppressClick.current = false;
    },
    onDragStart: (event: DragEvent<HTMLUListElement>): void => {
      if (enabled) event.preventDefault();
    },
    ref: track,
  };
}
