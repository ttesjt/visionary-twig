import type { ReactNode } from 'react';
import type { ThemePolicy, ThemePreference } from '../theme.js';

import type { ThemeSwitcherDirection } from '../theme.js';
export { THEME_SWITCHER_DIRECTIONS, type ThemeSwitcherDirection } from '../theme.js';
export interface ThemeSwitcherLabels {
  readonly label: string;
  readonly light: string;
  readonly dark: string;
  readonly system: string;
}
export interface ThemeSwitcherProps {
  readonly preference: ThemePreference;
  readonly onPreferenceChange: (preference: ThemePreference) => void;
  readonly labels?: ThemeSwitcherLabels;
  readonly policy?: ThemePolicy;
  readonly direction?: ThemeSwitcherDirection;
  readonly icons?: Partial<Readonly<Record<ThemePreference, ReactNode>>>;
  readonly className?: string;
}
export const DEFAULT_THEME_SWITCHER_LABELS: ThemeSwitcherLabels = {
  label: 'Theme',
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};
export const DIRECTION_KEYS = {
  down: { forward: 'ArrowDown', backward: 'ArrowUp' },
  up: { forward: 'ArrowUp', backward: 'ArrowDown' },
  right: { forward: 'ArrowRight', backward: 'ArrowLeft' },
  left: { forward: 'ArrowLeft', backward: 'ArrowRight' },
} as const;
