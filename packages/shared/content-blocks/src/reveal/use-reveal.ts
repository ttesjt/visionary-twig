'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RevealData } from './reveal.schema.js';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const EARLY_ENTRANCE_MARGIN_PX = 80;
const INTERSECTION_THRESHOLD = 0;
type RevealState = 'idle' | 'waiting' | 'entering' | 'visible';

function containsHashTarget(element: HTMLElement): boolean {
  // Author-defined fragments use the validated ASCII name grammar.
  const target = document.getElementById(window.location.hash.slice(1));
  return Boolean(target && (element.contains(target) || target.contains(element)));
}

export function useReveal({ once, trigger }: Required<Pick<RevealData, 'once' | 'trigger'>>) {
  const root = useRef<HTMLDivElement>(null);
  const motionContent = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RevealState>('idle');
  const completed = useRef(false);
  useEffect(() => {
    const element = root.current;
    if (!element || typeof IntersectionObserver === 'undefined' || !window.matchMedia) return;
    const motion = window.matchMedia(REDUCED_MOTION_QUERY);
    let observer: IntersectionObserver | undefined;
    const show = (immediate = false) => {
      completed.current = true;
      setState((current) => {
        if (immediate) return 'visible';
        if (current === 'waiting') return 'entering';
        return current === 'entering' ? current : 'visible';
      });
      if (once) observer?.disconnect();
    };
    const onHashChange = () => {
      if (containsHashTarget(element)) show(true);
    };
    const configure = () => {
      observer?.disconnect();
      if (motion.matches) {
        setState('idle');
        return;
      }
      if (once && completed.current) {
        setState('visible');
        return;
      }
      const margin = trigger === 'early' ? EARLY_ENTRANCE_MARGIN_PX : 0;
      const rect = element.getBoundingClientRect();
      const initiallyVisible = rect.bottom > -margin && rect.top < window.innerHeight + margin;
      if (
        initiallyVisible ||
        containsHashTarget(element) ||
        element.contains(document.activeElement)
      ) {
        show(true);
        if (once) return;
      } else setState('waiting');
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries.find((item) => item.target === element);
          if (!entry) return;
          if (entry.isIntersecting) show();
          else if (!once) setState('waiting');
        },
        { rootMargin: `${margin}px 0px`, threshold: INTERSECTION_THRESHOLD }
      );
      observer.observe(element);
    };
    configure();
    motion.addEventListener('change', configure);
    window.addEventListener('hashchange', onHashChange);
    const onFocus = () => show(true);
    element.addEventListener('focusin', onFocus);
    return () => {
      observer?.disconnect();
      motion.removeEventListener('change', configure);
      window.removeEventListener('hashchange', onHashChange);
      element.removeEventListener('focusin', onFocus);
    };
  }, [once, trigger]);
  useLayoutEffect(() => {
    if (state !== 'entering') return;
    // CSS owns timing (including host token overrides). Keep clipping only while the
    // actual transitions are running, then restore shadows/normal overflow.
    const animations = motionContent.current?.getAnimations?.() ?? [];
    if (!animations.length) {
      setState('visible');
      return;
    }
    let current = true;
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (current) setState('visible');
    });
    return () => {
      current = false;
    };
  }, [state]);
  return { root, motionContent, state };
}
