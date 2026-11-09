import type { ReactElement, ReactNode } from 'react';
import { SiteNavigation, type SiteNavigationProps } from '../navigation/site-navigation.js';
export interface SiteSidebarProps extends Omit<SiteNavigationProps, 'presentation'> {
  readonly brand?: { readonly label: string; readonly monogram?: string; readonly href: string };
  readonly subtitle?: string;
  readonly footer?: ReactNode;
}
export function SiteSidebar({
  brand,
  subtitle,
  footer,
  ...navigation
}: SiteSidebarProps): ReactElement {
  const Link = navigation.linkComponent ?? 'a';
  return (
    <aside className="ui-site-sidebar">
      {brand && (
        <Link className="ui-sidebar-brand" href={brand.href}>
          {brand.monogram && (
            <span className="ui-sidebar-monogram" aria-hidden="true">
              {brand.monogram}
            </span>
          )}
          <span>
            {brand.label}
            {subtitle && <small>{subtitle}</small>}
          </span>
        </Link>
      )}
      <SiteNavigation {...navigation} />
      {footer && <div className="ui-sidebar-footer">{footer}</div>}
    </aside>
  );
}
