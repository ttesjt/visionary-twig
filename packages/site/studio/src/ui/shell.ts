'use client';

export { StudioShell, type StudioShellProps } from './shell/studio-shell.js';
export { createStudioRegistry } from './shell/registry.js';
export { StudioIcon, type StudioIconName } from './shell/studio-icon.js';
export type {
  StudioPageDefinition,
  StudioPageContext,
  StudioPageGroup,
  StudioRegistry,
  StudioNavigation,
} from './shell/contracts.js';

export { StudioPageOutlet } from './shell/page-outlet.js';

export { StudioAppearanceSwitcher } from './shell/appearance-switcher.js';
export { useStudioTheme } from './shell/theme-context.js';
export type { StudioAppearance, StudioThemeState } from './shell/theme-context.js';
