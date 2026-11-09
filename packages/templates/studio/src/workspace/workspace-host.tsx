'use client';
import { useMemo, type ReactNode } from 'react';
import { useStudioPathname } from './navigation/use-studio-pathname';
import { studioHref } from './navigation/studio-url';
import { useStudioRouteLocale } from './navigation/studio-link';
import { useRouter } from 'next/navigation';
import { isDemoPageEditingPath, isDemoFocusedPath } from './demo/demo-routes';
import { StudioShell } from '@frontend/studio/shell';
import type { ThemePolicy, ThemePreference } from '@frontend/ui/theme';
import { useStudioAppearance } from '../theme/use-studio-appearance';
import { useStudioText } from '../text/use-studio-text';
import { createWorkspaceRegistry } from './registry';
import { studioRoutePageId, studioPageHref } from './page-ids';
export function WorkspaceHost({
  children,
  themePolicy,
  initialTheme,
}: {
  readonly children: ReactNode;
  readonly themePolicy: ThemePolicy;
  readonly initialTheme: ThemePreference;
}) {
  const appearance = useStudioAppearance(initialTheme, themePolicy);
  const router = useRouter();
  const locale = useStudioRouteLocale();
  const href = (id: string) => studioHref(studioPageHref(id), locale);
  const pathname = useStudioPathname();
  const pageId = studioRoutePageId(pathname);
  const text = useStudioText();
  const componentText = text.workspace;
  const studioRegistry = useMemo(() => createWorkspaceRegistry(text), [text]);
  if (!pageId) return children;
  return (
    <StudioShell
      layout={isDemoFocusedPath(pathname) ? 'focus' : 'workspace'}
      registry={studioRegistry}
      activePageId={pageId}
      contentKey={pathname}
      pageHeading={isDemoPageEditingPath(pathname) ? null : undefined}
      navigation={{ href, navigate: (id) => router.push(href(id)) }}
      brand={componentText.brand}
      workspace={componentText.name}
      environment={componentText.environment}
      text={componentText.chrome}
      themePolicy={themePolicy}
      appearance={appearance}
      footer={<p>{componentText.footer}</p>}
    >
      {children}
    </StudioShell>
  );
}
