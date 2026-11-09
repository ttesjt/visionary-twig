import { createContext, useContext, type ReactNode } from 'react';
import type { ThemePolicy, ThemePreference } from '@frontend/ui/theme';
/** Optional host-controlled appearance; the host chooses any persistence mechanism. */
export interface StudioAppearance {
  /** System is a preference, not a resolved color; CSS also follows OS changes in focused routes. */
  readonly preference: ThemePreference;
  readonly setPreference: (preference: ThemePreference) => void;
}
export interface StudioThemeState extends StudioAppearance {
  readonly policy: ThemePolicy;
}
const StudioThemeContext = createContext<StudioThemeState | null>(null);
export function StudioThemeScope({
  value,
  children,
}: {
  readonly value: StudioThemeState;
  readonly children: ReactNode;
}) {
  return <StudioThemeContext value={value}>{children}</StudioThemeContext>;
}
/** Resource tools consume the shell's one appearance state, never an independently initialized copy. */
export function useStudioTheme(): StudioThemeState {
  const state = useContext(StudioThemeContext);
  if (!state) throw new Error('Studio appearance requires a StudioShell ancestor.');
  return state;
}
