import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { cache } from 'react';
import { resolveThemePreference } from '@frontend/ui/theme';
import '@frontend/ui/default.css';
import '@frontend/styles/default.css';
import { NOT_FOUND_LOCALE_HEADER } from '../infra/errors/routes';
import { PageStatusView } from '../infra/errors/status-view';
import { localeHref } from '../infra/resources/routing';
import { serverText } from '../infra/resources/server';
import { RESOURCE_SCOPES } from '../site/resource-scopes';
import { DEFAULT_TEXT_LOCALE, TEXT_LOCALES } from '../site/text';
import { getThemePolicy } from '../site/theme-policy';

// Only the unmatched-route document reads the request header. Pages get their
// locale from the route segment, including during static generation.
const getNotFoundText = cache(async () => {
  const requested = (await headers()).get(NOT_FOUND_LOCALE_HEADER);
  const locale = TEXT_LOCALES.find((candidate) => candidate === requested) ?? DEFAULT_TEXT_LOCALE;
  return serverText(locale, RESOURCE_SCOPES.notFound);
});

export async function generateMetadata(): Promise<Metadata> {
  const text = await getNotFoundText();
  return { title: text.getText('main', 'status.notFound.title') };
}

export default async function GlobalNotFound() {
  const text = await getNotFoundText();
  return (
    <html lang={text.locale} data-theme={resolveThemePreference(getThemePolicy())}>
      <body>
        <PageStatusView
          homeHref={localeHref('/', text.locale)}
          text={{
            title: text.getText('main', 'status.notFound.title'),
            description: text.getText('main', 'status.notFound.description'),
            home: text.getText('main', 'status.home'),
          }}
        />
      </body>
    </html>
  );
}
