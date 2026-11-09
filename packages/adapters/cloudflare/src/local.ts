/** Node-only development entry. Never import this into a Worker or browser graph. */
import { isAbsolute } from 'node:path';
import { getPlatformProxy, type PlatformProxy } from 'wrangler';
import { createCloudflareStorage, type CloudflareBindings } from './connection.js';
import type { StorageConnection } from '@frontend/storage';
export async function openLocalCloudflareBindings(
  configPath: string,
  options: { readonly remoteBindings: boolean }
): Promise<PlatformProxy<CloudflareBindings>> {
  if (!isAbsolute(configPath)) throw new Error('Cloudflare configuration path must be absolute.');
  return getPlatformProxy<CloudflareBindings>({
    configPath,
    envFiles: [],
    persist: false,
    remoteBindings: options.remoteBindings,
  });
}

export async function openLocalCloudflareStorage(
  configPath: string,
  options: { readonly remoteBindings: boolean }
): Promise<StorageConnection> {
  const proxy = await openLocalCloudflareBindings(configPath, options);
  try {
    return { ...createCloudflareStorage(proxy.env), close: () => proxy.dispose() };
  } catch (error) {
    await proxy.dispose();
    throw error;
  }
}
