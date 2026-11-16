import { ContentRender } from '@frontend/puck-adapter';
import type { ReactElement } from 'react';
import type { PublishedProjectPage } from '../contracts.js';

export interface ProjectPageContentProps {
  readonly page: PublishedProjectPage;
  readonly navigationScope?: string;
}

export function ProjectPageContent({
  page,
  navigationScope,
}: ProjectPageContentProps): ReactElement {
  return (
    <article className="ui-project-page-content" lang={page.locale}>
      <ContentRender
        document={page.document}
        context={page.context}
        {...(navigationScope === undefined ? {} : { navigationScope })}
      />
    </article>
  );
}
