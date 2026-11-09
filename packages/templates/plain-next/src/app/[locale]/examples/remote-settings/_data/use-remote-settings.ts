'use client';
import useSWR from 'swr';
import { fetchRemoteSettings, type SettingsError } from './fetch-settings';
import {
  DEFAULT_REMOTE_SETTINGS,
  remoteSettingsKey,
  type RemoteSettings,
  type RemoteSettingsSource,
} from './schema';
export function useRemoteSettings(source: RemoteSettingsSource, enabled: boolean) {
  const response = useSWR<RemoteSettings, SettingsError>(
    enabled ? remoteSettingsKey(source) : null,
    fetchRemoteSettings,
    {
      shouldRetryOnError: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      keepPreviousData: false,
    }
  );
  return { ...response, settings: response.data ?? DEFAULT_REMOTE_SETTINGS };
}
