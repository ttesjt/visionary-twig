import { useEffect, type RefObject } from 'react';
import { subscribeGeometry } from '../scroll-boundary/geometry-updates.js';
import type { ContentNavigationItem } from './content-navigation.schema.js';
import type { ContentNavigationIntegration } from './navigation-integration.js';
import type { ReadingStore } from './reading-store.js';
const POSITION_TOLERANCE_PX = 1;
export function useReadingPosition(
  body: RefObject<HTMLDivElement | null>,
  origin: RefObject<HTMLDivElement | null>,
  items: readonly ContentNavigationItem[],
  store: ReadingStore,
  integration: ContentNavigationIntegration | null
): void {
  useEffect(() => {
    const region = body.current;
    const source = origin.current;
    if (!region || !source) return;
    const doc = region.ownerDocument;
    const view = doc.defaultView;
    if (!view) return;
    const geometry = integration?.geometry(source);
    function measure() {
      if (!region || !source || !view || !region.getClientRects().length) return;
      const edge = integration?.geometry(source).readingOffset ?? 0;
      const bounds = region.getBoundingClientRect();
      // A flow Header grows by one navigation row during handoff. Keep the
      // chapter in its reading band when native fragment scrolling preceded that growth.
      const handoffSpace = source.getBoundingClientRect().height;
      let href = items[0]?.href ?? '';
      // Native slots can stream or replace children after this effect mounted.
      const targets = items
        .map((item) => ({ item, element: doc.getElementById(item.href.slice(1)) }))
        .filter((target) => target.element && region.contains(target.element));
      for (const target of targets)
        if (
          target.element &&
          target.element.getBoundingClientRect().top <=
            Math.max(
              edge,
              parseFloat(view.getComputedStyle(target.element).scrollMarginBlockStart) || 0
            ) +
              handoffSpace +
              POSITION_TOLERANCE_PX
        )
          href = target.item.href;
      if (bounds.bottom <= view.innerHeight + POSITION_TOLERANCE_PX)
        href = items.at(-1)?.href ?? href;
      const extent = bounds.height - Math.max(0, view.innerHeight - edge);
      const progress =
        extent > 0
          ? Math.max(0, Math.min(1, (edge - bounds.top) / extent))
          : bounds.top <= edge
            ? 1
            : 0;
      store.publish({ href, progress });
    }
    const unsubscribe = subscribeGeometry(doc, measure, [
      region,
      source,
      ...(geometry?.observedElements ?? []),
    ]);
    let mutationFrame: number | undefined;
    const mutations =
      typeof view.MutationObserver === 'undefined'
        ? undefined
        : new view.MutationObserver(() => {
            if (mutationFrame !== undefined) return;
            mutationFrame = view.requestAnimationFrame(() => {
              mutationFrame = undefined;
              measure();
            });
          });
    mutations?.observe(region, { childList: true, subtree: true });
    measure();
    return () => {
      unsubscribe?.();
      mutations?.disconnect();
      if (mutationFrame !== undefined) view.cancelAnimationFrame(mutationFrame);
    };
  }, [body, origin, items, store, integration]);
}
