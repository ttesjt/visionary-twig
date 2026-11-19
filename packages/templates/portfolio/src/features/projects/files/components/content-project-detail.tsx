'use client';

import { projectFileScope } from '../resources';

import type { ScopeSnapshots } from '../../../../infra/resources';
import {
  ContentProvider,
  TextProvider,
  ResourceScope,
  useContent,
  useText,
} from '../../../../infra/resources/client';
import { localeHref } from '../../../../infra/resources/routing';
import { findProjectFilePage, PROJECT_FILES_PATH } from '../constants';
import { readFileProjectPage } from '../pages';
import { ProjectDetailView } from '../../components/project-detail-view';
import { useFileProjects } from './use-file-projects';

function Detail({ slug }: { readonly slug: string }) {
  const catalog = useFileProjects();
  const content = useContent();
  const text = useText();
  const project = catalog.projects.find((value) => value.slug === slug);
  if (!project) throw new Error('Unknown file project.');
  const page = findProjectFilePage(slug);
  const detail = page
    ? readFileProjectPage(project, () => content.getResolved(page.namespace, { text }))
    : { status: 'summary-only' as const, project };
  return (
    <ProjectDetailView
      project={project}
      status={detail.status}
      page={detail.status === 'ready' ? detail.page : undefined}
      backHref={localeHref(PROJECT_FILES_PATH, text.locale)}
    />
  );
}

export function ContentProjectDetail({
  slug,
  initialSnapshots,
}: {
  readonly slug: string;
  readonly initialSnapshots?: ScopeSnapshots | undefined;
}) {
  const page = findProjectFilePage(slug);
  if (!page) return <Detail slug={slug} />;
  const scope = projectFileScope(page.namespace);
  const content = (
    <ContentProvider scope={scope} initialSnapshot={initialSnapshots?.content}>
      <ResourceScope scope={scope}>
        <Detail slug={slug} />
      </ResourceScope>
    </ContentProvider>
  );
  return scope.text.length ? (
    <TextProvider scope={scope} initialSnapshot={initialSnapshots?.text}>
      {content}
    </TextProvider>
  ) : (
    content
  );
}
