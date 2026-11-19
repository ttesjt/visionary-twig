export interface AppearancePolicy<P extends string> {
  readonly presets: readonly P[];
  readonly defaultPreset: P;
  readonly storageKey: string;
}
/** Self-contained because the same validation runs in the pre-paint script. */
export function resolveAppearance<P extends string>(
  value: unknown,
  presets: readonly P[],
  fallback: P
): P {
  return presets.find((preset) => preset === value) ?? fallback;
}
export function assertAppearancePolicy<P extends string>(policy: AppearancePolicy<P>): void {
  if (
    !policy.storageKey.trim() ||
    !policy.presets.length ||
    new Set(policy.presets).size !== policy.presets.length ||
    !policy.presets.includes(policy.defaultPreset)
  )
    throw new RangeError(
      'Appearance requires a storage key, distinct presets and an included default.'
    );
}
/** The host chooses how to emit this script before visible content. No Next or CSS imports. */
export function appearanceBootstrapScript<P extends string>(policy: AppearancePolicy<P>): string {
  assertAppearancePolicy(policy);
  const args = JSON.stringify([policy.storageKey, policy.presets, policy.defaultPreset]).replace(
    /</g,
    '\\u003c'
  );
  return `((key, presets, fallback, resolve) => {
    let saved;
    try { saved = localStorage.getItem(key); } catch {}
    document.documentElement.setAttribute('data-style-preview', resolve(saved, presets, fallback));
  })(...${args}, ${resolveAppearance.toString()});`;
}

/** This browser preference belongs to the removable template preview only. */
export const APPEARANCE_PRESETS = ['neutral', 'mono'] as const;
export const APPEARANCE_STORAGE_KEY = 'portfolio-appearance';
export const APPEARANCE_POLICY = {
  presets: APPEARANCE_PRESETS,
  defaultPreset: 'mono',
  storageKey: APPEARANCE_STORAGE_KEY,
} as const satisfies AppearancePolicy<(typeof APPEARANCE_PRESETS)[number]>;
