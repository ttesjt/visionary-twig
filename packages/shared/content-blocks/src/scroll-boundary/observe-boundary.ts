import { boundaryPosition } from './boundary-position.js';
import { subscribeGeometry } from './geometry-updates.js';
import type { ScrollBoundaryRange, ScrollBoundaryState } from './scroll-boundary.schema.js';

interface BoundaryObservation {
  readonly element: HTMLElement;
  readonly start: HTMLElement;
  readonly end: HTMLElement;
  readonly scrollRoot: HTMLElement | null;
  readonly range: ScrollBoundaryRange;
  readonly offset: number;
  readonly getOffset?: ((element: HTMLElement) => number) | undefined;
  readonly onChange: (state: ScrollBoundaryState) => void;
}

export function observeBoundary({
  element,
  start,
  end,
  scrollRoot,
  range,
  offset,
  getOffset,
  onChange,
}: BoundaryObservation): () => void {
  const document = element.ownerDocument;
  const view = document.defaultView;
  if (!view) {
    onChange('pending');
    return () => {};
  }
  if (scrollRoot && (scrollRoot.ownerDocument !== document || !scrollRoot.contains(element)))
    throw new TypeError('ScrollBoundary scrollRoot must be an ancestor in the same document.');
  let observer: IntersectionObserver | undefined;
  let observerOffset: number | undefined;
  let disposed = false;
  let previous: ScrollBoundaryState | undefined;
  function emit(state: ScrollBoundaryState) {
    if (state === previous || disposed) return;
    previous = state;
    onChange(state);
  }
  function measure() {
    if (disposed || !view) return;
    if (!element.getClientRects().length || (scrollRoot && !scrollRoot.getClientRects().length)) {
      emit('pending');
      return;
    }
    const height = scrollRoot?.clientHeight ?? view.innerHeight;
    if (height <= 0) {
      emit('pending');
      return;
    }
    const reference = getOffset?.(element) ?? offset;
    if (!Number.isFinite(reference) || reference < 0)
      throw new TypeError('ScrollBoundary reference offsets must be finite and nonnegative.');
    const inset = Math.min(reference, height);
    const line =
      (scrollRoot ? scrollRoot.getBoundingClientRect().top + scrollRoot.clientTop : 0) + inset;
    const bounds = element.getBoundingClientRect();
    emit(boundaryPosition({ top: bounds.top, bottom: bounds.bottom, line, range }));
    if (typeof view.IntersectionObserver === 'undefined' || observerOffset === inset) return;
    observer?.disconnect();
    observerOffset = inset;
    // These markers stay in the original flow location; the component never docks itself.
    observer = new view.IntersectionObserver(measure, {
      root: scrollRoot,
      rootMargin: `-${inset}px 0px 0px 0px`,
      threshold: 0,
    });
    observer.observe(start);
    observer.observe(end);
  }
  const unsubscribe = subscribeGeometry(document, measure, [
    element,
    ...(scrollRoot ? [scrollRoot] : []),
  ]);
  // Read current geometry immediately, including when mounting at a deep link/restored scroll.
  measure();
  return () => {
    disposed = true;
    observer?.disconnect();
    unsubscribe?.();
  };
}
