import type {
  ComponentPropsWithoutRef,
  ComponentType,
  MouseEvent,
  ReactElement,
  ReactNode,
} from 'react';

interface NavigationTarget {
  readonly id: string;
  readonly href: string;
  readonly label: string;
}

export type SiteNavigationItem = NavigationTarget &
  (
    | { readonly display?: 'text'; readonly icon?: never; readonly marker?: never }
    | { readonly display: 'icon'; readonly icon: ReactNode; readonly marker?: never }
    | { readonly display: 'featured'; readonly icon?: ReactNode; readonly marker?: ReactNode }
  );

export type SiteLinkComponent = ComponentType<ComponentPropsWithoutRef<'a'>>;

export interface SiteNavigationProps {
  readonly items: readonly SiteNavigationItem[];
  readonly currentId?: string | undefined;
  readonly label: string;
  readonly presentation?: 'compact' | 'full';
  /** Supply framework links only from a client owner when used inside SiteHeader. */
  readonly linkComponent?: SiteLinkComponent | undefined;
  readonly onNavigate?: (() => void) | undefined;
}

function isCurrentWindowNavigation(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    (!event.currentTarget.target || event.currentTarget.target === '_self')
  );
}

export function SiteNavigation({
  items,
  currentId,
  label,
  linkComponent,
  onNavigate,
  presentation = 'full',
}: SiteNavigationProps): ReactElement {
  const Link = linkComponent ?? 'a';
  return (
    <nav className="ui-site-navigation" aria-label={label} data-presentation={presentation}>
      <ul className="ui-site-navigation-list">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="ui-site-navigation-link"
              data-display={item.display ?? 'text'}
              title={item.display === 'icon' ? item.label : undefined}
              aria-label={item.display === 'icon' ? item.label : undefined}
              aria-current={item.id === currentId ? 'page' : undefined}
              onClick={
                onNavigate
                  ? (event) => {
                      if (isCurrentWindowNavigation(event)) onNavigate();
                    }
                  : undefined
              }
            >
              {item.icon && (
                <span className="ui-site-navigation-icon" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span className="ui-site-navigation-label">{item.label}</span>
              {item.marker && (
                <span className="ui-site-navigation-marker" aria-hidden="true">
                  {item.marker}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
