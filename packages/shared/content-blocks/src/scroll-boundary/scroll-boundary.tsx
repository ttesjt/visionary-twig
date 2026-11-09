'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { contentClassName, type ContentProps } from '../shared/component-props.js';
import { observeBoundary } from './observe-boundary.js';
import {
  DEFAULT_SCROLL_BOUNDARY_OFFSET,
  DEFAULT_SCROLL_BOUNDARY_RANGE,
  scrollBoundaryPropsSchema,
  type ScrollBoundaryData,
  type ScrollBoundaryState,
} from './scroll-boundary.schema.js';

const ScrollBoundaryContext = createContext<ScrollBoundaryState | null>(null);
export function useScrollBoundaryState(): ScrollBoundaryState {
  const state = useContext(ScrollBoundaryContext);
  if (state === null) throw new Error('useScrollBoundaryState must be used inside ScrollBoundary.');
  return state;
}
export type ScrollBoundaryProps = ScrollBoundaryData &
  ContentProps & {
    readonly children?: ReactNode;
    readonly scrollRoot?: HTMLElement | null;
    readonly getOffset?: (element: HTMLElement) => number;
    readonly onStateChange?: (state: ScrollBoundaryState) => void;
  };

/** A position sensor. Content, layout, focus and host integrations remain caller-owned. */
export function ScrollBoundary({
  children,
  id,
  className,
  scrollRoot = null,
  getOffset,
  range = DEFAULT_SCROLL_BOUNDARY_RANGE,
  offset = DEFAULT_SCROLL_BOUNDARY_OFFSET,
  disabled = false,
  onStateChange,
}: ScrollBoundaryProps): ReactElement {
  scrollBoundaryPropsSchema.parse({ range, offset, disabled });
  const element = useRef<HTMLDivElement>(null);
  const start = useRef<HTMLSpanElement>(null);
  const end = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<ScrollBoundaryState>(disabled ? 'disabled' : 'pending');
  const callback = useRef(onStateChange);
  const notified = useRef<ScrollBoundaryState>('pending');
  useEffect(() => {
    callback.current = onStateChange;
  }, [onStateChange]);
  useEffect(() => {
    if (disabled) {
      setState('disabled');
      return;
    }
    if (!element.current || !start.current || !end.current) return;
    return observeBoundary({
      element: element.current,
      start: start.current,
      end: end.current,
      scrollRoot,
      range,
      offset,
      getOffset,
      onChange: setState,
    });
  }, [disabled, scrollRoot, range, offset, getOffset]);
  useEffect(() => {
    if (notified.current === state) return;
    notified.current = state;
    callback.current?.(state);
  }, [state]);
  return (
    <ScrollBoundaryContext value={state}>
      <div
        ref={element}
        id={id}
        className={contentClassName('ui-scroll-boundary', className)}
        data-scroll-boundary-state={state}
        data-range={range}
      >
        <span
          ref={start}
          className="ui-scroll-boundary-marker"
          data-edge="start"
          aria-hidden="true"
        />
        {children}
        <span ref={end} className="ui-scroll-boundary-marker" data-edge="end" aria-hidden="true" />
      </div>
    </ScrollBoundaryContext>
  );
}
