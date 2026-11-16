'use client';

import Link from 'next/link';
import type { ProjectSummary, PublishedProjectPage } from '@frontend/portfolio/contracts';
import { ProjectPageContent } from '@frontend/portfolio/render';
import { useText } from '../../../infra/resources/client';

export function ProjectDetailView({
  project,
  page,
  status,
  backHref,
}: {
  readonly project: ProjectSummary;
  readonly page?: PublishedProjectPage | undefined;
  readonly status: 'ready' | 'summary-only' | 'invalid-document';
  readonly backHref: string;
}) {
  const text = useText();
  return (
    <div className="ui-portfolio-page ui-portfolio-detail">
      <Link href={backHref}>{text.getText('main', 'projects.back')}</Link>
      <header className="ui-portfolio-page-heading" lang={project.locale}>
        <h1>{project.title}</h1>
        <p className="ui-portfolio-lead">{project.summary}</p>
      </header>
      {status === 'ready' && page && <ProjectPageContent page={page} />}
      {status === 'summary-only' && <p>{text.getText('main', 'projects.detailUnpublished')}</p>}
      {status === 'invalid-document' && (
        <p role="alert">{text.getText('main', 'projects.detailUnavailable')}</p>
      )}
    </div>
  );
}
