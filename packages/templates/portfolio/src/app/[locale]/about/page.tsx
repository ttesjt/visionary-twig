import { resourceRouteLocale, serverText } from '../../../infra/resources/server';
import { siteMetadata } from '../../../site/metadata';
import { RESOURCE_SCOPES } from '../../../site/resource-scopes';
import { SITE_ROUTES } from '../../../site/routes';
import { AboutSummary } from './_components/about-summary';

interface PageProps {
  readonly params: Promise<{ readonly locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  return siteMetadata(await resourceRouteLocale(params), SITE_ROUTES.about);
}

export default async function Page({ params }: PageProps) {
  const locale = await resourceRouteLocale(params);
  const text = await serverText(locale, RESOURCE_SCOPES.metadata);
  return (
    <div className="ui-portfolio-page">
      <h1>{text.getText('main', 'about.title')}</h1>
      <AboutSummary />
    </div>
  );
}
