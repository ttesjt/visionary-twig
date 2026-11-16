'use client';
import Link from 'next/link';
import { useAppConfig, useText } from '../../../infra/resources/client';
import { localeHref } from '../../../infra/resources/routing';
import { SITE_ROUTES } from '../../../site/routes';
import type { TextLocale } from '../../../site/text';
import { HomeProjects } from './home-projects';
import { ProjectBrowser } from '../../../features/projects/sql/client';
export function HomeContent({ locale }: { readonly locale: TextLocale }) {
  const text = useText();
  const { home } = useAppConfig().get('app');
  return (
    <div className="ui-portfolio-page">
      <h1>
        {text.getText('main', 'home.title') +
          (text.locale === 'zh' ? '' : ' ') +
          text.getText('main', 'home.titleEnd')}
      </h1>
      {home.showIntroduction && <p>{text.getText('main', 'home.description')}</p>}
      <Link href={localeHref(SITE_ROUTES.projects, text.locale)}>
        {text.getText('main', 'home.browseProjects')}
      </Link>
      <HomeProjects>
        <ProjectBrowser pathname={SITE_ROUTES.home} locale={locale} titleAs="h3" />
      </HomeProjects>
    </div>
  );
}
