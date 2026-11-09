'use client';
import { StudioDiscardDialog } from '@frontend/studio/navigation';
import { studioPathname } from '../../navigation/studio-url';
import { useStudioRouteLocale } from '../../navigation/studio-link';
import { resolveLocaleRoute } from '../../../infra/resources/routing';
import { demoEditingRoute } from '../demo-routes';
import { useStudioText } from '../../../text/use-studio-text';
import { useStudioRouteGuard } from '../../navigation/use-route-guard';
export function usePageNavigation(dirty: boolean, base: string, search: string) {
  const locale = useStudioRouteLocale();
  const guard = useStudioRouteGuard(dirty, (url) => {
    const destination = resolveLocaleRoute(url.pathname, url.searchParams.getAll('lang'));
    const query = new URLSearchParams(url.search);
    query.delete('lang');
    return (
      url.origin === location.origin &&
      destination.kind !== 'invalid' &&
      destination.locale === locale &&
      demoEditingRoute(studioPathname(url.pathname))?.base === base &&
      query.toString() === new URLSearchParams(search).toString()
    );
  });
  return <StudioDiscardDialog guard={guard} text={useStudioText().workspace.demo.pages.leave} />;
}
