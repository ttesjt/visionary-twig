'use client';
import Link from 'next/link';
import { Column, Row } from '@frontend/ui/layout';
import { useText } from '../../../../infra/resources/client';
import { localeHref } from '../../../../infra/resources/routing';

const EXAMPLES = [
  { href: '/examples/event-tracking', textKey: 'examples.tracking' },
  { href: '/examples/remote-settings', textKey: 'examples.remoteSettings' },
  { href: '/examples/text', textKey: 'examples.text' },
] as const;

const LAYOUT_JSX = `<Column space="section">
  <h2>{heading}</h2>
  <Row space="content" wrap="wrap" collapse="never">
    {links}
  </Row>
</Column>`;

export default function LayoutExamplePage() {
  const text = useText();
  return (
    <main className="example-page">
      <Column space="section">
        <header className="example-flow">
          <Link href={localeHref('/', text.locale)}>{text.getText('main', 'examples.back')}</Link>
          <h1 className="example-title">{text.getText('main', 'layout.title')}</h1>
          <p className="example-description">{text.getText('main', 'layout.description')}</p>
        </header>
        <nav className="example-layout-preview" aria-labelledby="layout-examples">
          <Column space="section">
            <h2 id="layout-examples">{text.getText('main', 'layout.links')}</h2>
            <Row space="content" wrap="wrap" collapse="never">
              {EXAMPLES.map(({ href, textKey }) => (
                <Link key={href} href={localeHref(href, text.locale)}>
                  {text.getText('main', textKey)}
                </Link>
              ))}
            </Row>
          </Column>
        </nav>
        <figure className="example-layout-source">
          <figcaption>{text.getText('main', 'layout.source')}</figcaption>
          <pre className="example-code">
            <code>{LAYOUT_JSX}</code>
          </pre>
        </figure>
      </Column>
    </main>
  );
}
