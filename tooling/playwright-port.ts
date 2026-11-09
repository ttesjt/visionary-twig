import path from 'node:path';
import { appAddress, defaultApp, discoverApps, selectApp } from './workspace-apps.ts';
// Compatibility entry; the generated workspace chooses its default app and directory.
const root = path.resolve(import.meta.dirname, '..');
export const DEFAULT_PLAYWRIGHT_PORT = discoverApps(root).find(
  (app) => app.id === defaultApp(root)
)?.testPort;
export function playwrightAddress(value: string | undefined): { port: number; baseURL: string } {
  return appAddress(selectApp(root, defaultApp(root)), value);
}
