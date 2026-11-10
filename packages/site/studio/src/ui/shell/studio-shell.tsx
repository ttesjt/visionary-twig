import { Suspense, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Dialog } from '@frontend/ui/dialog';
import { StudioAppearanceSwitcher } from './appearance-switcher.js';
import { DEFAULT_THEME_POLICY, resolveThemePreference, type ThemePolicy } from '@frontend/ui/theme';
import type { StudioNavigation, StudioRegistry } from './contracts.js';
import { DEFAULT_STUDIO_SHELL_TEXT, type StudioShellTextCatalog } from './text-catalog.js';
import { StudioPageNavigation } from './studio-navigation.js';
import { StudioPageBoundary } from './page-boundary.js';
import { StudioPageScope, StudioPageOutlet } from './page-outlet.js';
import { StudioThemeScope, type StudioAppearance } from './theme-context.js';
import { StudioIcon } from './studio-icon.js';

export interface StudioShellProps {
  /** Focus keeps the route subtree mounted while hiding workspace navigation and chrome. */
  readonly layout?: 'workspace' | 'focus';
  readonly registry: StudioRegistry;
  readonly activePageId: string;
  /** Host-owned content identity; nested routes can change while the active navigation entry stays the same. */
  readonly contentKey?: string;
  readonly navigation: StudioNavigation;
  readonly brand: string;
  readonly workspace: string;
  readonly environment?: string;
  readonly headerActions?: ReactNode;
  /** Undefined renders registered metadata; null omits the heading for a resource workspace. */
  readonly pageHeading?: ReactNode;
  readonly children?: ReactNode;
  readonly footer?: ReactNode;
  readonly text?: StudioShellTextCatalog;
  readonly themePolicy?: ThemePolicy;
  /** Controlled value and change callback; omit to keep shell-local appearance state. */
  readonly appearance?: StudioAppearance;
}
/** Router-, editor- and provider-independent workspace. Hosts supply code-owned pages and navigation. */
export function StudioShell({
  layout = 'workspace',
  registry,
  activePageId,
  contentKey,
  navigation,
  brand,
  workspace,
  environment,
  headerActions,
  pageHeading,
  footer,
  children,
  text: componentText = DEFAULT_STUDIO_SHELL_TEXT,
  themePolicy = DEFAULT_THEME_POLICY,
  appearance,
}: StudioShellProps) {
  const page = registry.findPage(activePageId);
  if (!page) throw new Error('Unknown Studio page: ' + activePageId);
  const identity = contentKey ?? activePageId;
  const [menuState, setMenu] = useState({ identity, open: false });
  if (menuState.identity !== identity) setMenu({ identity, open: false });
  const menuOpen = menuState.identity === identity && menuState.open;
  const setMenuOpen = (open: boolean) => setMenu({ identity, open });
  const [requestedTheme, setRequestedTheme] = useState(() => resolveThemePreference(themePolicy));
  const theme = resolveThemePreference(themePolicy, appearance?.preference ?? requestedTheme);
  const changeTheme: StudioAppearance['setPreference'] = (requested) => {
    if (themePolicy.mode === 'fixed') return;
    const preference = resolveThemePreference(themePolicy, requested);
    if (appearance) appearance.setPreference(preference);
    else setRequestedTheme(preference);
  };
  const contentId = useId();
  const content = useRef<HTMLElement>(null);
  const previousPage = useRef(identity);
  useEffect(() => {
    if (previousPage.current !== identity) {
      previousPage.current = identity;
      content.current?.focus({ preventScroll: true });
    }
  }, [identity]);
  const group = registry.groups.find((item) => item.id === page.group);
  const navigate = (id: string) => {
    if (!registry.findPage(id)) throw new Error('Unknown Studio page: ' + id);
    setMenuOpen(false);
    navigation.navigate(id);
  };
  const menu = (
    <StudioPageNavigation
      registry={registry}
      activePageId={activePageId}
      navigation={navigation}
      label={componentText.navigation}
      onNavigate={navigate}
    />
  );
  return (
    <StudioThemeScope
      value={{
        policy: themePolicy,
        preference: theme,
        setPreference: changeTheme,
      }}
    >
      <div className="ui-studio-shell" data-theme={theme} data-layout={layout}>
        <a
          className="ui-studio-skip"
          href={'#' + contentId}
          onClick={() => content.current?.focus()}
        >
          {componentText.skipToContent}
        </a>
        <aside className="ui-studio-sidebar" hidden={layout === 'focus'}>
          <div className="ui-studio-brand">
            <span className="ui-studio-brand-mark" aria-hidden="true">
              <StudioIcon name="grid" />
            </span>
            <span>{brand}</span>
          </div>
          <div className="ui-studio-workspace-identity">
            <span className="ui-studio-workspace-avatar" aria-hidden="true">
              {workspace.slice(0, 1)}
            </span>
            <span>{workspace}</span>
          </div>
          {menu}
          <div className="ui-studio-sidebar-footer">
            {footer}
            {environment && (
              <p className="ui-studio-environment">
                <span aria-hidden="true" />
                {environment}
              </p>
            )}
          </div>
        </aside>
        <div className="ui-studio-main-column">
          <header className="ui-studio-topbar" hidden={layout === 'focus'}>
            <div className="ui-studio-breadcrumb">
              <button
                className="ui-studio-icon-button ui-studio-menu-trigger"
                type="button"
                aria-label={componentText.openNavigation}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
              >
                <StudioIcon name="menu" />
              </button>
              <span>{group?.label}</span>
              <StudioIcon name="chevron" />
              <span aria-current="page">{page.title}</span>
            </div>
            <div className="ui-studio-topbar-actions">
              <StudioAppearanceSwitcher text={componentText.theme} />
              {headerActions}
            </div>
          </header>
          <main id={contentId} ref={content} className="ui-studio-main" tabIndex={-1}>
            {pageHeading === undefined ? (
              <header className="ui-studio-page-heading">
                <p className="ui-studio-eyebrow">{workspace}</p>
                <h1>{page.title}</h1>
                {page.description && <p>{page.description}</p>}
              </header>
            ) : (
              pageHeading
            )}
            <StudioPageBoundary key={page.id} resetKey={identity} text={componentText}>
              <Suspense
                fallback={
                  <p role="status" className="ui-studio-surface">
                    {componentText.loading}
                  </p>
                }
              >
                <StudioPageScope value={{ page, registry, navigate }}>
                  {children ?? <StudioPageOutlet />}
                </StudioPageScope>
              </Suspense>
            </StudioPageBoundary>
          </main>
        </div>
        <Dialog
          className="ui-studio-navigation-dialog"
          open={menuOpen && layout !== 'focus'}
          onOpenChange={setMenuOpen}
          title={brand}
          closeLabel={componentText.closeNavigation}
          closeIcon={<StudioIcon name="close" />}
          data-theme={theme}
        >
          {menu}
        </Dialog>
      </div>
    </StudioThemeScope>
  );
}
