'use client';
import { localeHref } from '../../../../../infra/resources/routing';
import Link from 'next/link';
import { TrackingExample } from './tracking-example';
import { useText } from '../../../../../infra/resources/client';
export function TrackingPageContent() {
  const text = useText();
  return (
    <main className="example-page example-sections">
      <Link href={localeHref('/', text.locale)}>{text.getText('main', 'examples.back')}</Link>
      <h1>{text.getText('main', 'tracking.title')}</h1>
      <p>{text.getText('main', 'tracking.description')}</p>
      <TrackingExample />
    </main>
  );
}
