import type { ReactElement } from 'react';
import type { ProjectSummary } from '../contracts.js';
import { ProjectCard } from './project-card.js';

export interface ProjectGridProps {
  readonly projects: readonly ProjectSummary[];
  readonly text: { readonly empty: string; readonly pinned?: string };
  readonly projectHref?: (project: ProjectSummary) => string | undefined;
  readonly coverUrl?: (project: ProjectSummary) => string | undefined;
  readonly badgeUrl?: (project: ProjectSummary) => string | undefined;
  readonly coverSourceUrl?: (project: ProjectSummary, objectKey: string) => string | undefined;
  readonly coverSizes?: string;
}

export function ProjectGrid({
  projects,
  text,
  projectHref,
  coverUrl,
  badgeUrl,
  coverSourceUrl,
  coverSizes,
}: ProjectGridProps): ReactElement {
  if (projects.length === 0) return <p className="ui-project-grid-empty">{text.empty}</p>;
  return (
    <ul className="ui-project-grid">
      {projects.map((project) => (
        <li key={project.id}>
          <ProjectCard
            project={project}
            href={projectHref?.(project)}
            coverUrl={coverUrl?.(project)}
            pinnedLabel={text.pinned}
            badgeUrl={badgeUrl?.(project)}
            coverSourceUrl={
              coverSourceUrl ? (objectKey) => coverSourceUrl(project, objectKey) : undefined
            }
            coverSizes={coverSizes}
          />
        </li>
      ))}
    </ul>
  );
}
