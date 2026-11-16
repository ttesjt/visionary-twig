'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { localeHref } from '../infra/resources/routing';
import { useContent, useText } from '../infra/resources/client';
import { SITE_ROUTES } from '../site/routes';
import { DEFAULT_TEXT_LOCALE, TEXT_LOCALES } from '../site/text';
import { ThemePicker } from './theme-picker';

const navigation = [
  { href: SITE_ROUTES.home, key: 'navigation.home' },
  { href: SITE_ROUTES.about, key: 'navigation.about' },
] as const;

export function SiteNavigation() {
  const text = useText();
  const { displayName } = useContent().get('base');
  const pathname = usePathname();
  const router = useRouter();
  const prefix = TEXT_LOCALES.find(
    (locale) => pathname === '/' + locale || pathname.startsWith('/' + locale + '/')
  );
  const path = prefix ? pathname.slice(prefix.length + 1) || '/' : pathname;
  return (
    <header className="ui-portfolio-header">
      <Link className="ui-portfolio-brand" href={localeHref(SITE_ROUTES.home, text.locale)}>
        {displayName}
      </Link>
      <nav aria-label={text.getText('main', 'navigation.label')}>
        {navigation.map(({ key, href }) => (
          <Link
            key={key}
            href={localeHref(href, text.locale)}
            aria-current={path === href ? 'page' : undefined}
          >
            {text.getText('main', key)}
          </Link>
        ))}
      </nav>
      <div className="ui-portfolio-controls">
        <label className="ui-portfolio-picker">
          <span>{text.getText('main', 'navigation.language')}</span>
          <select
            value={text.locale}
            onChange={(event) => {
              const locale = event.target.value;
              if (!TEXT_LOCALES.some((enabled) => enabled === locale)) return;
              const url = new URL(window.location.href);
              url.pathname = path;
              if (locale === DEFAULT_TEXT_LOCALE) url.searchParams.delete('lang');
              else url.searchParams.set('lang', locale);
              router.push(url.pathname + url.search);
            }}
          >
            <option value="en" lang="en">
              {text.getText('main', 'navigation.languages.en')}
            </option>
            <option value="zh" lang="zh">
              {text.getText('main', 'navigation.languages.zh')}
            </option>
          </select>
        </label>
        <ThemePicker />
      </div>
    </header>
  );
}
