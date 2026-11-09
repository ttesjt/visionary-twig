'use client';
import { localeHref } from '../../../infra/resources/routing';
import Link from 'next/link';
import { ThemePicker } from '../../../components/theme-picker';
import { useText, useAppConfig, useContent } from '../../../infra/resources/client';
export function HomeContent() {
  const text = useText();
  const config = useAppConfig().get('app');
  const base = useContent().get('base');
  return (
    <main className="example-page example-sections">
      <header className="example-header example-controls">
        <p>{text.getText('main', 'home.brand')}</p>
        <ThemePicker />
      </header>
      <div className="example-flow">
        <h1 className="example-title">{text.getText('main', 'home.title')}</h1>
        {config.home.showIntroduction && (
          <p className="example-description">{text.getText('main', 'home.description')}</p>
        )}
        <nav className="example-flow">
          <Link href={localeHref('/examples/text', text.locale)}>
            {text.getText('main', 'examples.text')}
          </Link>
          <Link href={localeHref('/examples/content', text.locale)}>
            {text.getText('main', 'content.open', { collection: base.collection })}
          </Link>
        </nav>
      </div>
    </main>
  );
}
