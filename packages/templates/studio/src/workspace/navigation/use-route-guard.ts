import { useRouter } from 'next/navigation';
import { useStudioNavigationGuard, type StudioNavigationGuard } from '@frontend/studio/navigation';
export function useStudioRouteGuard(
  when: boolean,
  allow?: (url: URL) => boolean
): StudioNavigationGuard {
  const router = useRouter();
  return useStudioNavigationGuard({
    when,
    ...(allow ? { allow } : {}),
    navigate: (href) => {
      const url = new URL(href, location.href);
      if (url.origin === location.origin) router.push(url.pathname + url.search + url.hash);
      else location.assign(url.href);
    },
  });
}
