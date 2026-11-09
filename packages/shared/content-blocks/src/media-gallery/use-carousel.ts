import { useEffect, useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Fade from 'embla-carousel-fade';
import { useReducedMotion } from '../media/use-reduced-motion.js';
import type { MediaGalleryData } from './media-gallery.schema.js';

/** Unitless Embla physics duration, not milliseconds. */
export const CAROUSEL_SCROLL_DURATION = 25;
/** Embla owns geometry and gestures; React owns the semantic image selection. */
export function useCarousel({
  enabled,
  loop,
  transition,
  onSelect,
}: {
  readonly enabled: boolean;
  readonly loop: boolean;
  readonly transition: NonNullable<MediaGalleryData['transition']>;
  readonly onSelect: (index: number) => void;
}) {
  const reducedMotion = useReducedMotion();
  const plugins = useMemo(() => (transition === 'fade' ? [Fade()] : []), [transition]);
  const [viewportRef, api] = useEmblaCarousel(
    {
      active: enabled,
      loop,
      duration: reducedMotion ? 0 : CAROUSEL_SCROLL_DURATION,
      watchResize: typeof ResizeObserver !== 'undefined',
    },
    plugins
  );
  useEffect(() => {
    if (!api || !enabled) return;
    const selected = () => onSelect(api.selectedScrollSnap());
    selected();
    api.on('select', selected).on('reInit', selected);
    return () => {
      api.off('select', selected).off('reInit', selected);
    };
  }, [api, enabled, onSelect]);
  return { viewportRef, api, reducedMotion };
}
