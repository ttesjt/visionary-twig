'use client';

export { HeaderExtensionProvider } from './header-extension/provider.js';
export type { HeaderExtensionProviderProps } from './header-extension/provider.js';
export { HeaderExtension, useHeaderExtension } from './header-extension/use-header-extension.js';
export type { HeaderExtensionProps } from './header-extension/use-header-extension.js';
export type { HeaderExtensionLease, HeaderExtensionValue } from './header-extension/registry.js';
export {
  HEADER_EXTENSION_PRESENTATIONS,
  DEFAULT_HEADER_EXTENSION_PRESENTATION,
} from './header-extension/surface.js';
export type { HeaderExtensionPresentation } from './header-extension/surface.js';
export {
  HEADER_EXTENSION_DENSITIES,
  DEFAULT_HEADER_EXTENSION_DENSITY,
} from './header-extension/density.js';
export type { HeaderExtensionDensity } from './header-extension/density.js';
export { HeaderExtensionPopover } from './header-extension/popover.js';
export type { HeaderExtensionPopoverProps } from './header-extension/popover.js';
