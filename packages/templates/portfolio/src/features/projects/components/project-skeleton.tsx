const PROJECT_PLACEHOLDER_COUNT = 2;

export function ProjectSkeleton({
  label,
  showFilters = false,
}: {
  readonly label: string;
  readonly showFilters?: boolean;
}) {
  return (
    <div className="ui-portfolio-loading" role="status">
      <span className="ui-portfolio-sr-only">{label}</span>
      {showFilters && <div className="ui-portfolio-skeleton-filters" aria-hidden="true" />}
      <div className="ui-project-grid" aria-hidden="true">
        {Array.from({ length: PROJECT_PLACEHOLDER_COUNT }, (_, index) => (
          <div className="ui-portfolio-skeleton-card" key={index}>
            <div className="ui-portfolio-skeleton-cover" />
            <div className="ui-portfolio-skeleton-title" />
            <div className="ui-portfolio-skeleton-summary" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectCategorySkeleton({ label }: { readonly label: string }) {
  return (
    <div className="ui-portfolio-loading" role="status">
      <span className="ui-portfolio-sr-only">{label}</span>
      <div className="ui-portfolio-skeleton-filters" aria-hidden="true" />
    </div>
  );
}
