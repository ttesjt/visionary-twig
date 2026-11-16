import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ProjectSummary } from '@frontend/portfolio/contracts';
import { ProjectBadge, ProjectCoverImage, ProjectPin } from '@frontend/portfolio/ui';

export interface ProjectLinks {
  readonly detail: (project: ProjectSummary) => string;
  readonly media: (project: ProjectSummary, objectKey: string) => string;
}

export function ProjectCards({
  projects,
  categoryLabels,
  links,
  pinnedLabel,
  titleAs: Title,
}: {
  readonly projects: readonly ProjectSummary[];
  readonly categoryLabels: (project: ProjectSummary) => ReactNode;
  readonly links: ProjectLinks;
  readonly pinnedLabel: string;
  readonly titleAs: 'h2' | 'h3';
}) {
  const coverSizes = projects.length === 1 ? 'auto, 100vw' : 'auto, (max-width: 48rem) 100vw, 50vw';
  return (
    <ul className="ui-project-grid">
      {projects.map((project) => (
        <li key={project.id}>
          <article className="ui-project-card" lang={project.locale}>
            <div
              className="ui-portfolio-project-cover"
              data-empty={project.cover ? undefined : true}
            >
              {project.cover && (
                <ProjectCoverImage
                  cover={project.cover}
                  src={links.media(project, project.cover.objectKey)}
                  sourceUrl={(objectKey) => links.media(project, objectKey)}
                  sizes={coverSizes}
                />
              )}
              <span className="ui-mono-project-arrow" aria-hidden="true">
                ↗
              </span>
            </div>
            <div className="ui-portfolio-project-info">
              {categoryLabels(project)}
              <Title className="ui-project-card-title">
                {project.badge && (
                  <ProjectBadge
                    badge={project.badge}
                    imageUrl={
                      project.badge.type === 'image'
                        ? links.media(project, project.badge.objectKey)
                        : undefined
                    }
                  />
                )}
                <Link href={links.detail(project)}>{project.title}</Link>
                {project.pinned && <ProjectPin label={pinnedLabel} />}
              </Title>
              <p className="ui-project-card-summary">{project.summary}</p>
              {project.links.length > 0 && (
                <ul className="ui-project-card-links">
                  {project.links.map(({ label, href }) => (
                    <li key={href}>
                      <a href={href}>{label}</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
