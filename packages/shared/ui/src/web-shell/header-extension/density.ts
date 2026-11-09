/** Semantic spacing presets for the shell's layout stylesheet. */
export const HEADER_EXTENSION_DENSITIES = ['compact', 'comfortable', 'flush'] as const;
export type HeaderExtensionDensity = (typeof HEADER_EXTENSION_DENSITIES)[number];
export const DEFAULT_HEADER_EXTENSION_DENSITY: HeaderExtensionDensity = 'compact';
