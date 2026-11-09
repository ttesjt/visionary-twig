import { z } from 'zod';

export const REVEAL_EFFECTS = [
  'fade',
  'rise',
  'slide-start',
  'slide-end',
  'scale',
  'wipe',
] as const;
export const REVEAL_DURATIONS = ['quick', 'normal', 'gentle'] as const;
export const REVEAL_DELAYS = ['none', 'short', 'long'] as const;
export const REVEAL_TRIGGERS = ['visible', 'early'] as const;
export const DEFAULT_REVEAL_EFFECT = 'rise';
export const DEFAULT_REVEAL_DURATION = 'normal';
export const DEFAULT_REVEAL_DELAY = 'none';
export const DEFAULT_REVEAL_TRIGGER = 'visible';
export const DEFAULT_REVEAL_ONCE = true;
export const revealPropsSchema = z.strictObject({
  effect: z.enum(REVEAL_EFFECTS).optional(),
  duration: z.enum(REVEAL_DURATIONS).optional(),
  delay: z.enum(REVEAL_DELAYS).optional(),
  trigger: z.enum(REVEAL_TRIGGERS).optional(),
  once: z.boolean().optional(),
});
export type RevealData = z.infer<typeof revealPropsSchema>;
