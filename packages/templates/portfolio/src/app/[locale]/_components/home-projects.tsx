'use client';

import { Suspense, type ReactNode } from 'react';
import { useText } from '../../../infra/resources/client';
import { ProjectSkeleton } from '../../../features/projects/client';

export function HomeProjects({ children }: { readonly children: ReactNode }) {
  const text = useText();
  const loading = <ProjectSkeleton label={text.getText('main', 'projects.loading')} showFilters />;
  return (
    <section id="work" className="ui-portfolio-home-work" aria-labelledby="work-title">
      <h2 id="work-title">{text.getText('main', 'home.work')}</h2>
      <Suspense fallback={loading}>{children}</Suspense>
    </section>
  );
}
