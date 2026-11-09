/** The adapter's single membership check, also serialized into the early repair script. */
export function findThemePreference<T extends string>(
  value: unknown,
  supported: readonly T[]
): T | undefined {
  return supported.find((candidate) => candidate === value);
}
