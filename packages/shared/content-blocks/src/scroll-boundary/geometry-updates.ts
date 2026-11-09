const subscriptions = new WeakMap<Document, GeometryUpdates>();

interface GeometryUpdates {
  readonly subscribe: (measure: () => void, elements: readonly Element[]) => () => void;
}

/** One event/resize subscription and one queued measurement batch per document.
 * RAF combines notifications; it is not advertised as lowering the scroll frame rate. */
function createGeometryUpdates(
  document: Document,
  view: Window & typeof globalThis
): GeometryUpdates {
  const callbacks = new Set<() => void>();
  const watched = new Map<Element, number>();
  const baseElements = new Set<Element>([
    document.documentElement,
    ...(document.body ? [document.body] : []),
  ]);
  let frame: number | undefined;
  const schedule = () => {
    if (frame !== undefined || !callbacks.size) return;
    frame = view.requestAnimationFrame(() => {
      frame = undefined;
      for (const callback of callbacks) callback();
    });
  };
  const resize =
    typeof view.ResizeObserver === 'undefined' ? undefined : new view.ResizeObserver(schedule);
  const options = { capture: true, passive: true } as const;
  document.addEventListener('scroll', schedule, options);
  document.addEventListener('load', schedule, options);
  view.addEventListener('resize', schedule);
  view.addEventListener('pageshow', schedule);
  document.fonts?.addEventListener('loadingdone', schedule);
  for (const element of baseElements) resize?.observe(element);
  return {
    subscribe(measure, elements) {
      callbacks.add(measure);
      for (const element of new Set(elements)) {
        const count = watched.get(element) ?? 0;
        if (!count) resize?.observe(element);
        watched.set(element, count + 1);
      }
      return () => {
        callbacks.delete(measure);
        for (const element of new Set(elements)) {
          const count = (watched.get(element) ?? 1) - 1;
          if (count) watched.set(element, count);
          else {
            watched.delete(element);
            if (!baseElements.has(element)) resize?.unobserve(element);
          }
        }
        if (callbacks.size) return;
        if (frame !== undefined) view.cancelAnimationFrame(frame);
        resize?.disconnect();
        document.removeEventListener('scroll', schedule, options);
        document.removeEventListener('load', schedule, options);
        view.removeEventListener('resize', schedule);
        view.removeEventListener('pageshow', schedule);
        document.fonts?.removeEventListener('loadingdone', schedule);
        subscriptions.delete(document);
      };
    },
  };
}
export function subscribeGeometry(
  document: Document,
  measure: () => void,
  elements: readonly Element[]
): (() => void) | undefined {
  const view = document.defaultView;
  if (!view) return undefined;
  let updates = subscriptions.get(document);
  if (!updates) {
    updates = createGeometryUpdates(document, view);
    subscriptions.set(document, updates);
  }
  return updates.subscribe(measure, elements);
}
