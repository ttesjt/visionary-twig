import { useLayoutEffect } from 'react';
import type { ViewerImage } from './viewer-image.schema.js';

/** The pinned photo engine has no alt hook. Keep its small DOM bridge at this boundary. */
export function usePhotoAccessibility(
  surface: HTMLElement | null,
  images: readonly ViewerImage[],
  index: number
): void {
  useLayoutEffect(() => {
    if (!surface) return;
    const sync = () => {
      surface.querySelector('.ui-content-photo-slider')?.setAttribute('role', 'presentation');
      const first = Math.max(0, index - 1);
      surface.querySelectorAll('.PhotoView__PhotoWrap').forEach((wrap, position) => {
        const current = first + position;
        wrap.setAttribute('aria-hidden', String(current !== index));
        wrap.toggleAttribute('inert', current !== index);
        const image = wrap.querySelector('img');
        const asset = images[current];
        if (image && asset) image.alt = asset.alt;
      });
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(surface, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });
    return () => observer.disconnect();
  }, [surface, images, index]);
}
