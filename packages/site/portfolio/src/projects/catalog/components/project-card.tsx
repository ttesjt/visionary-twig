import type { ReactElement } from 'react';
import type { ProjectSummary } from '../contracts.js';
import { ProjectPin } from './project-pin.js';
import { ProjectBadge } from './project-badge.js';
import { ProjectCoverImage } from './project-cover-image.js';

export interface ProjectCardProps {
  readonly project: ProjectSummary;
  readonly href?: string | undefined;
  readonly coverUrl?: string | undefined;
  readonly pinnedLabel?: string | undefined;
  readonly badgeUrl?: string | undefined;
  readonly coverSourceUrl?: ((objectKey: string) => string | undefined) | undefined;
  readonly coverSizes?: string | undefined;
}

export function ProjectCard({
  project,
  href,
  coverUrl,
  pinnedLabel,
  badgeUrl,
  coverSourceUrl,
  coverSizes,
}: ProjectCardProps): ReactElement {
  return (
    <article className="ui-project-card" lang={project.locale}>
      {project.cover && coverUrl && (
        <ProjectCoverImage
          cover={project.cover}
          src={coverUrl}
          sourceUrl={coverSourceUrl}
          sizes={coverSizes}
        />
      )}
      <h2 className="ui-project-card-title">
        {project.badge && <ProjectBadge badge={project.badge} imageUrl={badgeUrl} />}
        {href ? <a href={href}>{project.title}</a> : project.title}
        {project.pinned && pinnedLabel && <ProjectPin label={pinnedLabel} />}
      </h2>
      <p className="ui-project-card-summary">{project.summary}</p>
      {project.links.length > 0 && (
        <ul className="ui-project-card-links">
          {project.links.map(({ label, href: linkHref }, index) => (
            <li key={index}>
              <a href={linkHref}>{label}</a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
