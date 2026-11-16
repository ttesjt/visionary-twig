'use client';
import { Suspense, type ReactNode } from 'react';
import { useText } from '../../../infra/resources/client';
import { ProjectSkeleton } from '../../../features/projects/client';
export function HomeProjects({ children }: { readonly children: ReactNode }) {
  const text = useText();
  return (
    <section id="work" aria-labelledby="work-title">
      <h2 id="work-title">{text.getText('main', 'home.work')}</h2>
      <Suspense
        fallback={<ProjectSkeleton label={text.getText('main', 'projects.loading')} showFilters />}
      >
        {children}
      </Suspense>
    </section>
  );
}
