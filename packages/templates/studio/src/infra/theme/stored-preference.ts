/** Undefined means storage is unavailable; null means no saved choice. Safe to serialize. */
export function readStoredPreference(key: string): string | null | undefined {
  try {
    return localStorage.getItem(key);
  } catch {
    return undefined;
  }
}
