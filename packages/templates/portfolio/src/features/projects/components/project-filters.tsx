import type { ProjectCategory } from '@frontend/portfolio/contracts';
import { ProjectCategoryFilter } from '@frontend/portfolio/ui';
import { useEffect, useRef } from 'react';
import { followProjectLink, navigateProjects } from './project-navigation';

function revealCategory(track: HTMLElement, selected: HTMLElement): void {
  if (!track.clientWidth || track.scrollWidth <= track.clientWidth) return;
  const viewport = track.getBoundingClientRect();
  const target = selected.getBoundingClientRect();
  const style = getComputedStyle(track);
  const start =
    viewport.left + track.clientLeft + (Number.parseFloat(style.scrollPaddingLeft) || 0);
  const end =
    viewport.left +
    track.clientLeft +
    track.clientWidth -
    (Number.parseFloat(style.scrollPaddingRight) || 0);
  if (target.width > end - start || target.left < start) {
    track.scrollBy({ left: target.left - start, behavior: 'instant' });
  } else if (target.right > end) {
    track.scrollBy({ left: target.right - end, behavior: 'instant' });
  }
}

export function ProjectFilters({
  categories,
  active,
  hrefForCategory,
  text,
}: {
  readonly categories: readonly ProjectCategory[];
  readonly active: string | null;
  readonly hrefForCategory: (id: string | null) => string;
  readonly text: { readonly label: string; readonly all: string };
}) {
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const track = rail.current;
    const selected = track?.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
    if (!track || !selected) return;
    const reveal = () => revealCategory(track, selected);
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(track);
    observer.observe(selected);
    return () => observer.disconnect();
  }, [active, categories]);

  return (
    <>
      <div className="ui-neutral-project-filter">
        <ProjectCategoryFilter
          categories={categories}
          selectedCategoryId={active}
          onCategoryChange={(id) => navigateProjects(hrefForCategory(id))}
          text={text}
        />
      </div>
      <div ref={rail} className="ui-mono-project-filters" role="group" aria-label={text.label}>
        <a
          href={hrefForCategory(null)}
          aria-current={active === null ? 'page' : undefined}
          onClick={followProjectLink}
        >
          {text.all}
        </a>
        {categories.map(({ id, label }) => (
          <a
            key={id}
            href={hrefForCategory(id)}
            aria-current={active === id ? 'page' : undefined}
            onClick={followProjectLink}
          >
            {label}
          </a>
        ))}
      </div>
    </>
  );
}
