'use client';

import Image from 'next/image';
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
  const title = text.getText('main', 'home.title');
  const titleEnd = text.getText('main', 'home.titleEnd');
  const separator = text.locale === 'zh' ? '' : ' ';
  const projectLabel = text.getText('main', 'home.browseProjects');
  const contact = localeHref(SITE_ROUTES.contact, text.locale);
  return (
    <div className="ui-portfolio-page ui-portfolio-home">
      <div className="ui-portfolio-hero">
        <p className="ui-portfolio-eyebrow">{text.getText('main', 'home.eyebrow')}</p>
        <div className="ui-portfolio-hero-body">
          <h1 aria-label={title + separator + titleEnd}>
            <span>{title}</span>
            {separator}
            <em>{titleEnd}</em>
          </h1>
          <div className="ui-portfolio-hero-aside">
            {home.showIntroduction && (
              <p className="ui-portfolio-lead">{text.getText('main', 'home.description')}</p>
            )}
            <a className="ui-portfolio-work-link" href="#work">
              {projectLabel}
              <span aria-hidden="true">↘</span>
            </a>
            <div className="ui-portfolio-actions ui-portfolio-home-actions">
              <Link href={localeHref(SITE_ROUTES.projects, text.locale)}>{projectLabel}</Link>
              <Link href={contact}>{text.getText('main', 'navigation.contact')}</Link>
            </div>
          </div>
        </div>
        {home.image && (
          <Image
            className="ui-portfolio-hero-image"
            {...home.image}
            alt={text.getText('main', 'home.imageAlt')}
            unoptimized
          />
        )}
      </div>
      <HomeProjects>
        <ProjectBrowser pathname={SITE_ROUTES.home} locale={locale} titleAs="h3" />
      </HomeProjects>
      <section className="ui-portfolio-footer">
        <h2>{text.getText('main', 'contact.prompt')}</h2>
        <Link href={contact}>
          {text.getText('main', 'contact.action')} <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </div>
  );
}
