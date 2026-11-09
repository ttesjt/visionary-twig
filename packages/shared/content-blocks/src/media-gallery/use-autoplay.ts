import { useEffect, useState, type RefObject } from 'react';
import { useReducedMotion } from '../media/use-reduced-motion.js';

export const GALLERY_AUTOPLAY_INTERVAL_MS = 6000;
/** Playback is opt-in and stops for reduced motion, hidden/offscreen content and user interaction. */
export function useAutoplay({
  enabled,
  canAdvance,
  blocked,
  onAdvance,
  root,
}: {
  readonly enabled: boolean;
  readonly canAdvance: boolean;
  readonly blocked: boolean;
  readonly onAdvance: () => void;
  readonly root: RefObject<HTMLElement | null>;
}) {
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [inView, setInView] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!enabled) return;
    const updateVisibility = (): void => setVisible(document.visibilityState !== 'hidden');
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    const element = root.current;
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? undefined
        : new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false));
    if (element && observer) observer.observe(element);
    else setInView(true);
    return () => {
      document.removeEventListener('visibilitychange', updateVisibility);
      observer?.disconnect();
    };
  }, [root, enabled]);
  const playing =
    enabled && canAdvance && !paused && !blocked && visible && inView && !reducedMotion;
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(onAdvance, GALLERY_AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playing, onAdvance]);
  return { paused, setPaused, reducedMotion };
}
