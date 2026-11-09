'use client';

import type { ReactElement, ReactNode } from 'react';
import { contentClassName, type ContentProps } from '../shared/component-props.js';
import {
  DEFAULT_REVEAL_DELAY,
  DEFAULT_REVEAL_DURATION,
  DEFAULT_REVEAL_EFFECT,
  DEFAULT_REVEAL_ONCE,
  DEFAULT_REVEAL_TRIGGER,
  type RevealData,
} from './reveal.schema.js';
import { useReveal } from './use-reveal.js';

export type RevealProps = RevealData & ContentProps & { readonly children?: ReactNode };
/** Progressive enhancement: SSR and unsupported/reduced-motion clients remain visible. */
export function Reveal({
  children,
  id,
  className,
  effect = DEFAULT_REVEAL_EFFECT,
  duration = DEFAULT_REVEAL_DURATION,
  delay = DEFAULT_REVEAL_DELAY,
  trigger = DEFAULT_REVEAL_TRIGGER,
  once = DEFAULT_REVEAL_ONCE,
}: RevealProps): ReactElement {
  const { root, motionContent, state } = useReveal({ once, trigger });
  return (
    <div
      ref={root}
      id={id}
      className={contentClassName('ui-reveal', className)}
      data-reveal-state={state}
      data-effect={effect}
      data-duration={duration}
      data-delay={delay}
    >
      <div ref={motionContent} className="ui-reveal-content">
        {children}
      </div>
    </div>
  );
}
