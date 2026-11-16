import { ThemeProvider } from '../../infra/theme/client';
import { TrackingInitialization } from '../../infra/event-tracking/client';
import { RESOURCE_SCOPES } from '../../infra/resources';
import { siteMetadata } from '../../site/metadata';
import type { Metadata } from 'next';
import { ResourceLayout } from '../../infra/resources/client';
import { prepareScopeResources, resourceRouteLocale } from '../../infra/resources/server';
import { TEXT_LOCALES } from '../../infra/resources/index';
import type { ReactNode } from 'react';
import { resolveThemePreference } from '@frontend/ui/theme';
import { getThemePolicy } from '../../site/theme-policy';
import '../../styles/index';
import { PortfolioFrame } from '../../components/portfolio-frame';

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ readonly locale: string }>;
}): Promise<Metadata> {
  return siteMetadata(await resourceRouteLocale(params));
}
export function generateStaticParams() {
  return TEXT_LOCALES.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  readonly children: ReactNode;
  readonly params: Promise<{ readonly locale: string }>;
}) {
  const policy = getThemePolicy();
  const locale = await resourceRouteLocale(params);
  const initialSnapshots = await prepareScopeResources(RESOURCE_SCOPES.layout, locale);
  return (
    <html lang={locale} data-theme={resolveThemePreference(policy)} suppressHydrationWarning>
      <body>
        <ThemeProvider policy={policy}>
          <ResourceLayout initialLocale={locale} initialSnapshots={initialSnapshots}>
            <TrackingInitialization />
            <PortfolioFrame>{children}</PortfolioFrame>
          </ResourceLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
