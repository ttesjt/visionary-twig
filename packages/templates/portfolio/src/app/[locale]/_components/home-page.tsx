'use client';
import Link from 'next/link';
import { useAppConfig, useText } from '../../../infra/resources/client';
import { localeHref } from '../../../infra/resources/routing';
import { SITE_ROUTES } from '../../../site/routes';
export function HomeContent() {
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
      <Link href={localeHref(SITE_ROUTES.about, text.locale)}>
        {text.getText('main', 'navigation.about')}
      </Link>
    </div>
  );
}
