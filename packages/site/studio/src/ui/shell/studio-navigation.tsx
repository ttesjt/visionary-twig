import type { MouseEvent } from 'react';
import type { StudioNavigation, StudioRegistry } from './contracts.js';
import { StudioIcon } from './studio-icon.js';

export function StudioPageNavigation({
  registry,
  activePageId,
  navigation,
  label,
  onNavigate,
}: {
  readonly registry: StudioRegistry;
  readonly activePageId: string;
  readonly navigation: StudioNavigation;
  readonly label: string;
  readonly onNavigate: (pageId: string) => void;
}) {
  function follow(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    onNavigate(id);
  }
  return (
    <nav aria-label={label} className="ui-studio-page-navigation">
      {registry.groups.map((group) => {
        const pages = registry.pages.filter((page) => page.group === group.id);
        if (!pages.length) return null;
        return (
          <div key={group.id} className="ui-studio-navigation-group">
            <p className="ui-studio-eyebrow">{group.label}</p>
            <ul>
              {pages.map((page) => (
                <li key={page.id}>
                  <a
                    href={navigation.href(page.id)}
                    aria-current={page.id === activePageId ? 'page' : undefined}
                    onClick={(event) => follow(event, page.id)}
                  >
                    <span className="ui-studio-navigation-icon" aria-hidden="true">
                      {page.icon ?? <StudioIcon name="page" />}
                    </span>
                    <span>{page.title}</span>
                    {page.id === activePageId && (
                      <span className="ui-studio-active-mark" aria-hidden="true" />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
