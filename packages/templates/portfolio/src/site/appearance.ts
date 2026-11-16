/** Keep the site's default appearance and preference key at this entry. */
export const APPEARANCE_PRESETS = ['neutral', 'mono'] as const;
export type AppearancePreset = (typeof APPEARANCE_PRESETS)[number];
export const DEFAULT_APPEARANCE: AppearancePreset = 'mono';
export const APPEARANCE_STORAGE_KEY = 'portfolio-appearance';
