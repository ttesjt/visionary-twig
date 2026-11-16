import { resourceRouteLocale, serverText } from '../../../infra/resources/server';
import { siteMetadata } from '../../../site/metadata';
import { RESOURCE_SCOPES } from '../../../site/resource-scopes';
import { SITE_ROUTES } from '../../../site/routes';
import { ContactContent } from '../../../features/contact/client';

interface PageProps {
  readonly params: Promise<{ readonly locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  return siteMetadata(await resourceRouteLocale(params), SITE_ROUTES.contact);
}

export default async function Page({ params }: PageProps) {
  const locale = await resourceRouteLocale(params);
  const text = await serverText(locale, RESOURCE_SCOPES.metadata);
  return (
    <div className="ui-portfolio-page">
      <header className="ui-portfolio-page-heading">
        <h1>{text.getText('main', 'contact.title')}</h1>
        <p className="ui-portfolio-lead">{text.getText('main', 'contact.description')}</p>
      </header>
      <ContactContent />
    </div>
  );
}
