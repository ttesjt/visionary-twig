import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import type { HeaderExtensionSnapshot } from './registry.js';

type Phase = 'closed' | 'opening' | 'expanding' | 'open' | 'closing';
/** CSS owns timing; completion/cancellation, including reduced motion, owns DOM retention. */
export function useExtensionPresence(
  snapshot: HeaderExtensionSnapshot | null,
  ref: RefObject<HTMLDivElement | null>
) {
  const visible = snapshot !== null && snapshot.visible !== false;
  const [retained, setRetained] = useState<HeaderExtensionSnapshot | null>(null);
  const [phase, setPhase] = useState<Phase>('closed');
  useLayoutEffect(() => {
    if (visible) {
      setRetained(snapshot);
      setPhase((current) => (current === 'closed' || current === 'closing' ? 'opening' : current));
    } else setPhase((current) => (current === 'closed' ? current : 'closing'));
  }, [snapshot, visible]);
  useEffect(() => {
    let frame: number | undefined;
    let current = true;
    if (phase === 'opening') {
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (current) setPhase('expanding');
        });
      });
    } else if (phase === 'expanding' || phase === 'closing') {
      frame = requestAnimationFrame(() => {
        const animations = ref.current?.getAnimations?.() ?? [];
        void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
          if (!current) return;
          setPhase(phase === 'closing' ? 'closed' : 'open');
          if (phase === 'closing') setRetained(null);
        });
      });
    }
    return () => {
      current = false;
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [phase, ref]);
  return {
    displayed: visible ? snapshot : retained,
    phase,
    expanded: visible && (phase === 'expanding' || phase === 'open'),
    interactive: visible && phase === 'open',
  };
}
