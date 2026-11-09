import { NextResponse, type NextRequest } from 'next/server';
import { NOT_FOUND_ROUTE } from './infra/errors/routes';
import { DEFAULT_TEXT_LOCALE } from './site/text';
import { resolveLocaleRoute } from './infra/resources/routing';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === '/api/preview') return previewResponse(NextResponse.next());
  const route = resolveLocaleRoute(path, request.nextUrl.searchParams.getAll('lang'));
  if (route.kind === 'invalid') {
    const destination = request.nextUrl.clone();
    destination.pathname = '/' + DEFAULT_TEXT_LOCALE + NOT_FOUND_ROUTE;
    destination.search = '';
    return NextResponse.rewrite(destination, { status: 404 });
  }
  const destination = request.nextUrl.clone();
  if (route.kind === 'rewrite') destination.pathname = route.pathname;
  const response = route.kind === 'pass' ? NextResponse.next() : NextResponse.rewrite(destination);
  return destination.pathname.startsWith('/' + route.locale + '/preview/')
    ? previewResponse(response)
    : response;
}
function previewResponse(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
export const config = { matcher: ['/api/preview', '/((?!_next|resources|api|.*\\..*).*)'] };
