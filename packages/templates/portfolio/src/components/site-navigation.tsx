'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { localeHref } from '../infra/resources/routing';
import { useAppConfig, useContent, useText } from '../infra/resources/client';
import { SITE_NAVIGATION_IDS, SITE_ROUTES } from '../site/routes';
import { DEFAULT_TEXT_LOCALE, TEXT_LOCALES } from '../site/text';
import type { ReactNode } from 'react';
import { PreferenceSelect } from './preference-select';
import { ThemePicker } from './theme-picker';

export function SiteNavigation({
  preferenceExtensions,
}: {
  readonly preferenceExtensions?: ReactNode;
}) {
  const text = useText();
  const { displayName } = useContent().get('base');
  const { header } = useAppConfig().get('app');
  const { layout = 'full-width', brandImage, hiddenNavigation = [] } = header ?? {};
  const navigation = SITE_NAVIGATION_IDS.filter((id) => !hiddenNavigation.includes(id));
  const pathname = usePathname();
  const prefix = TEXT_LOCALES.find(
    (locale) => pathname === '/' + locale || pathname.startsWith('/' + locale + '/')
  );
  const path = prefix ? pathname.slice(prefix.length + 1) || '/' : pathname;
  return (
    <header className="ui-portfolio-header" data-layout={layout}>
      <div className="ui-portfolio-header-inner">
        <Link className="ui-portfolio-brand" href={localeHref(SITE_ROUTES.home, text.locale)}>
          {brandImage && (
            // The configured image file is used directly, including SVG brand marks.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="ui-portfolio-brand-image"
              src={brandImage}
              alt=""
              width={36}
              height={36}
            />
          )}
          <span>{displayName}</span>
        </Link>
        {navigation.length > 0 && (
          <nav aria-label={text.getText('main', 'navigation.label')}>
            {navigation.map((id) => (
              <Link
                key={id}
                href={localeHref(SITE_ROUTES[id], text.locale)}
                aria-current={path === SITE_ROUTES[id] ? 'page' : undefined}
              >
                {text.getText('main', `navigation.${id}`)}
              </Link>
            ))}
          </nav>
        )}
        <div className="ui-portfolio-controls">
          <ThemePicker />
          <details
            className="ui-portfolio-settings"
            onKeyDown={(event) => {
              if (event.key !== 'Escape' || !event.currentTarget.open) return;
              event.currentTarget.open = false;
              event.currentTarget.querySelector('summary')?.focus();
            }}
          >
            <summary>
              <span aria-hidden="true">⋯</span>
              <span className="ui-portfolio-sr-only">
                {text.getText('main', 'navigation.settings')}
              </span>
            </summary>
            <div className="ui-portfolio-settings-panel">
              <PreferenceSelect
                label={text.getText('main', 'navigation.language')}
                value={text.locale}
                options={TEXT_LOCALES.map((locale) => ({
                  value: locale,
                  label: text.getText('main', `navigation.languages.${locale}`),
                  lang: locale,
                }))}
                onChange={(locale) => {
                  const url = new URL(window.location.href);
                  url.pathname = path;
                  if (locale === DEFAULT_TEXT_LOCALE) url.searchParams.delete('lang');
                  else url.searchParams.set('lang', locale);
                  // A locale change prepares the destination document before displaying its localized UI.
                  window.location.assign(url);
                }}
              />
              {preferenceExtensions}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
