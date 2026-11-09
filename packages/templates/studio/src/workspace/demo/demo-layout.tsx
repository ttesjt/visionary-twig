'use client';
import type { ReactNode } from 'react';
import { StudioLink } from '../navigation/studio-link';
import { useStudioPathname } from '../navigation/use-studio-pathname';
import { useStudioText } from '../../text/use-studio-text';
import { DEMO_ROUTES, isDemoPageEditingPath, isDemoFocusedPath } from './demo-routes';
export function DemoLayout({ children }: { readonly children: ReactNode }) {
  const path = useStudioPathname();
  const focused = isDemoFocusedPath(path);
  const editing = isDemoPageEditingPath(path);
  const componentText = useStudioText().workspace.demo;
  return (
    <div className={focused ? 'ui-studio-focus-container' : 'ui-studio-flow'}>
      <div hidden={focused} className={editing ? 'ui-studio-resource-context' : 'ui-studio-flow'}>
        <nav className="ui-studio-subnavigation" aria-label={componentText.navigation}>
          <StudioLink
            href={DEMO_ROUTES.list}
            aria-current={path === DEMO_ROUTES.list ? 'page' : undefined}
          >
            {componentText.list}
          </StudioLink>
          <StudioLink
            href={DEMO_ROUTES.upload}
            aria-current={path === DEMO_ROUTES.upload ? 'page' : undefined}
          >
            {componentText.create}
          </StudioLink>
          <StudioLink
            href={DEMO_ROUTES.pages}
            aria-current={path.startsWith(DEMO_ROUTES.pages) ? 'page' : undefined}
          >
            {componentText.pages.title}
          </StudioLink>
        </nav>
        {editing ? (
          <details className="ui-studio-inline-help">
            <summary>{componentText.pages.controls.scope}</summary>
            <p>{componentText.notice}</p>
          </details>
        ) : (
          <p className="ui-studio-notice">{componentText.notice}</p>
        )}
      </div>
      {children}
    </div>
  );
}
