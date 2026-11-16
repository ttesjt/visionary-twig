import { useText } from '../../../infra/resources/client';
import type { ProjectLocation } from '../project-location';
import { followProjectLink } from './project-navigation';

function PageLink({ href, label }: { readonly href?: string | undefined; readonly label: string }) {
  return href ? (
    <a href={href} onClick={followProjectLink}>
      {label}
    </a>
  ) : (
    <button type="button" disabled>
      {label}
    </button>
  );
}

export function ProjectPagination({
  location,
  hrefFor,
  hasMore,
  recovery,
}: {
  readonly location: ProjectLocation;
  readonly hrefFor: (location: ProjectLocation) => string;
  readonly hasMore: boolean;
  readonly recovery: ProjectLocation | null;
}) {
  const text = useText();
  const { page, category } = location;
  return (
    <div className="ui-portfolio-project-pagination">
      <p className="ui-mono-project-pagination-info">
        {text.getText('main', 'projects.page', { page: String(page).padStart(2, '0') })}
      </p>
      <div className="ui-portfolio-actions">
        {recovery && (
          <PageLink
            href={hrefFor(recovery)}
            label={text.getText(
              'main',
              recovery.category !== category ? 'projects.all' : 'projects.first'
            )}
          />
        )}
        <PageLink
          href={page > 1 ? hrefFor({ category, page: page - 1 }) : undefined}
          label={text.getText('main', 'projects.previous')}
        />
        <PageLink
          href={hasMore ? hrefFor({ category, page: page + 1 }) : undefined}
          label={text.getText('main', 'projects.next')}
        />
      </div>
    </div>
  );
}
