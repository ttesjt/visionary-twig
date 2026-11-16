import { remoteSettingsSchema, type RemoteSettings } from './schema';
export type SettingsErrorKind = 'http' | 'network' | 'invalid-json' | 'invalid-data';
export class SettingsError extends Error {
  constructor(readonly kind: SettingsErrorKind) {
    super('Remote settings unavailable: ' + kind);
  }
}
const SETTINGS_REQUEST_TIMEOUT_MS = 5_000;
export async function fetchRemoteSettings(url: string): Promise<RemoteSettings> {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(SETTINGS_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new SettingsError('network');
  }
  if (!response.ok) {
    void response.body?.cancel().catch(() => {});
    throw new SettingsError('http');
  }
  let input: unknown;
  try {
    input = await response.json();
  } catch (error) {
    throw new SettingsError(error instanceof SyntaxError ? 'invalid-json' : 'network');
  }
  const parsed = remoteSettingsSchema.safeParse(input);
  if (!parsed.success) throw new SettingsError('invalid-data');
  return parsed.data;
}
