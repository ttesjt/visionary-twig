import { TrackingInitialization } from '../../infra/event-tracking/client';
import { RESOURCE_SCOPES } from '../../infra/resources';
import { siteMetadata } from '../../site/metadata';
import type { Metadata } from 'next';
import { ResourceLayout } from '../../infra/resources/client';
import { prepareScopeResources, resourceRouteLocale } from '../../infra/resources/server';
import type { ReactNode } from 'react';
import { getStudioTheme } from '../../theme/server-theme';
import { getThemePolicy } from '../../site/theme-policy';
import '@frontend/ui/default.css';
import '@frontend/styles/default.css';
import '@frontend/content-blocks/default.css';
import '@frontend/styles/content-blocks.css';

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ readonly locale: string }>;
}): Promise<Metadata> {
  return siteMetadata(await resourceRouteLocale(params));
}

export default async function RootLayout({
  children,
  params,
}: {
  readonly children: ReactNode;
  readonly params: Promise<{ readonly locale: string }>;
}) {
  const locale = await resourceRouteLocale(params);
  const initialSnapshots = await prepareScopeResources(RESOURCE_SCOPES.layout, locale);
  return (
    <html lang={locale} data-theme={await getStudioTheme(getThemePolicy())}>
      <body>
        <ResourceLayout initialLocale={locale} initialSnapshots={initialSnapshots}>
          <TrackingInitialization />
          {children}
        </ResourceLayout>
      </body>
    </html>
  );
}
