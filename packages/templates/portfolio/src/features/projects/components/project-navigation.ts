'use client';

import { useSyncExternalStore, type MouseEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  parseProjectLocation,
  projectLocationHref,
  type ProjectLocation,
} from '../project-location';
import type { TextLocale } from '../../../site/text';

function subscribeToFragment(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener('popstate', onChange);
  };
}

export function useProjectNavigation(pathname: string, locale: TextLocale, pageSize: number) {
  const search = useSearchParams();
  const hash = useSyncExternalStore(
    subscribeToFragment,
    () => window.location.hash,
    () => ''
  );
  return {
    location: parseProjectLocation(
      {
        category: search.getAll('category'),
        page: search.getAll('page'),
      },
      pageSize
    ),
    hrefFor: (location: ProjectLocation) =>
      projectLocationHref(pathname, search.toString(), hash, locale, location),
  };
}

export function navigateProjects(href: string): void {
  const url = new URL(href, window.location.href);
  if (!url.hash) url.hash = window.location.hash;
  if (url.href !== window.location.href) window.history.pushState(null, '', url);
}

export function followProjectLink(event: MouseEvent<HTMLAnchorElement>): void {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey
  )
    return;
  event.preventDefault();
  if (event.currentTarget.getAttribute('aria-current') === 'page') return;
  navigateProjects(event.currentTarget.href);
}
