import type { Metadata } from 'next';
import { RemoteSettingsPageContent } from './_components/remote-settings-page';
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function RemoteSettingsPage() {
  return <RemoteSettingsPageContent />;
}
