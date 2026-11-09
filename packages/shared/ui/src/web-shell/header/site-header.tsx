'use client';

import { useId, useSyncExternalStore, type ReactElement, type ReactNode } from 'react';
import { Button } from '../../button.js';
import { Container } from '../../layout.js';
import { Dialog } from '../../dialog.js';
import { useSiteMenu } from './use-site-menu.js';
import { SiteBrandContent, type SiteHeaderBrand } from './site-brand.js';
import {
  HeaderExtensionSurface,
  DEFAULT_HEADER_EXTENSION_PRESENTATION,
  type HeaderExtensionPresentation,
} from '../header-extension/surface.js';
import {
  SiteNavigation,
  type SiteNavigationProps,
  type SiteNavigationItem,
} from '../navigation/site-navigation.js';

export interface SiteHeaderProps extends Omit<
  SiteNavigationProps,
  'onNavigate' | 'label' | 'presentation'
> {
  readonly brand: SiteHeaderBrand;
  readonly labels: {
    readonly navigation: string;
    readonly openMenu: string;
    readonly closeMenu: string;
    readonly menuTitle: string;
  };
  readonly children?: ReactNode;
  readonly className?: string;
  readonly position?: 'flow' | 'sticky';
  readonly extensionPresentation?: HeaderExtensionPresentation;
  readonly actions?: {
    readonly label: string;
    readonly items: readonly SiteNavigationItem[];
  };
  /** Optional override for the links shown in the mobile menu. */
  readonly menuItems?: readonly SiteNavigationItem[];
}

const subscribe = (): (() => void) => () => {};
const clientSnapshot = (): boolean => true;
const serverSnapshot = (): boolean => false;

export function SiteHeader({
  brand,
  items,
  currentId,
  labels,
  linkComponent,
  children,
  className,
  position = 'flow',
  actions,
  menuItems,
  extensionPresentation = DEFAULT_HEADER_EXTENSION_PRESENTATION,
}: SiteHeaderProps): ReactElement {
  const Link = linkComponent ?? 'a';
  const menu = useSiteMenu();
  const enhanced = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const menuId = useId();
  const navigationProps = { items, currentId, label: labels.navigation, linkComponent };
  const actionItems = actions?.items ?? [];
  const mobileItems = menuItems ?? [...items, ...actionItems];
  const actionIds = new Set(actionItems.map((item) => item.id));
  const mobilePages = mobileItems.filter((item) => !actionIds.has(item.id));
  const mobileActions = mobileItems.filter((item) => actionIds.has(item.id));

  return (
    <header
      className={className ? `ui-site-header ${className}` : 'ui-site-header'}
      data-position={position}
      data-enhanced={enhanced ? 'true' : 'false'}
      data-extension-presentation={extensionPresentation}
    >
      <div className="ui-site-header-primary">
        <Container>
          <div className="ui-site-header-content">
            <Link
              className="ui-site-brand"
              href={brand.href}
              aria-label={brand.display === 'image' ? brand.label : undefined}
              data-display={brand.display ?? 'text'}
              onClick={menu.hide}
            >
              <SiteBrandContent brand={brand} />
            </Link>
            <div className="ui-site-desktop-navigation">
              <SiteNavigation {...navigationProps} presentation="compact" />
            </div>
            <div className="ui-site-header-controls">
              {actions && actions.items.length > 0 && (
                <div className="ui-site-header-action-navigation">
                  <SiteNavigation
                    items={actions.items}
                    currentId={currentId}
                    label={actions.label}
                    linkComponent={linkComponent}
                    presentation="compact"
                  />
                </div>
              )}
              {children}
              <Button
                className="ui-site-menu-toggle"
                aria-label={labels.openMenu}
                title={labels.openMenu}
                aria-expanded={menu.expanded}
                aria-controls={menuId}
                onClick={menu.show}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </div>
          </div>
        </Container>
      </div>
      <HeaderExtensionSurface />
      <Dialog
        className="ui-site-menu"
        id={menuId}
        ref={menu.ref}
        open={menu.expanded}
        onOpenChange={menu.setOpen}
        data-state={menu.phase}
        onPointerDown={menu.onPointerDown}
        onPointerUp={menu.onPointerUp}
        onPointerCancel={menu.onPointerCancel}
        title={labels.menuTitle}
        closeLabel={labels.closeMenu}
        closeIcon={
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        }
      >
        {mobilePages.length > 0 && (
          <SiteNavigation
            {...navigationProps}
            items={mobilePages}
            presentation="full"
            onNavigate={menu.hide}
          />
        )}
        {mobilePages.length > 0 && mobileActions.length > 0 && (
          <hr className="ui-site-menu-divider" aria-hidden="true" />
        )}
        {actions && mobileActions.length > 0 && (
          <SiteNavigation
            {...navigationProps}
            items={mobileActions}
            label={actions.label}
            presentation="full"
            onNavigate={menu.hide}
          />
        )}
      </Dialog>
    </header>
  );
}
