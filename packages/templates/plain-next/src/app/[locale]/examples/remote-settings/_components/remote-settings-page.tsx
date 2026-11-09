'use client';
import { localeHref } from '../../../../../infra/resources/routing';
import Link from 'next/link';
import { RemoteSettingsExample } from './remote-settings-example';
import { useText } from '../../../../../infra/resources/client';
export function RemoteSettingsPageContent() {
  const text = useText();
  return (
    <main className="example-page example-sections">
      <Link href={localeHref('/', text.locale)}>{text.getText('main', 'examples.back')}</Link>
      <h1>{text.getText('main', 'remoteSettings.title')}</h1>
      <p>{text.getText('main', 'remoteSettings.description')}</p>
      <RemoteSettingsExample />
    </main>
  );
}
