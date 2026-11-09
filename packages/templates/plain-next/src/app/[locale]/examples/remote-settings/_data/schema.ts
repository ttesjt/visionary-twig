import { z } from 'zod';
export const REMOTE_SETTINGS_SOURCES = ['comfortable', 'compact', 'invalid', 'missing'] as const;
export type RemoteSettingsSource = (typeof REMOTE_SETTINGS_SOURCES)[number];
export const remoteSettingsSchema = z.strictObject({
  density: z.enum(['compact', 'comfortable']),
  showNote: z.boolean(),
});
export type RemoteSettings = z.infer<typeof remoteSettingsSchema>;
export const DEFAULT_REMOTE_SETTINGS: RemoteSettings = Object.freeze({
  density: 'comfortable',
  showNote: true,
});
export function remoteSettingsKey(source: RemoteSettingsSource): string {
  return '/samples/remote-settings/' + source + '.json';
}
