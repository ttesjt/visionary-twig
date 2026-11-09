import type { MouseEvent } from 'react';

/** Preserve native URLs/modifiers while accounting for the actual combined Header bounds. */
export function scrollExtensionAnchor(event: MouseEvent<HTMLDivElement>): void {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey
  )
    return;
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest<HTMLAnchorElement>('a[href]');
  if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
  const url = new URL(link.href);
  if (
    !url.hash ||
    url.origin !== location.origin ||
    url.pathname !== location.pathname ||
    url.search !== location.search
  )
    return;
  let id: string;
  try {
    id = decodeURIComponent(url.hash.slice(1));
  } catch {
    return;
  }
  const target = document.getElementById(id);
  const header = event.currentTarget.closest('header');
  if (!target || !header) return;
  event.preventDefault();
  const spacing = parseFloat(getComputedStyle(event.currentTarget).paddingBlockStart) || 0;
  const clearance =
    Math.max(
      header.getBoundingClientRect().bottom,
      event.currentTarget.getBoundingClientRect().bottom
    ) + spacing;
  history.pushState(null, '', url);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({
    top: window.scrollY + target.getBoundingClientRect().top - clearance,
    behavior: reduced ? 'instant' : 'smooth',
  });
}
