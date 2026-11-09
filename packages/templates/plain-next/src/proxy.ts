import { NextResponse, type NextRequest } from 'next/server';
import { NOT_FOUND_ROUTE } from './infra/errors/routes';
import { DEFAULT_TEXT_LOCALE } from './site/text';
import { resolveLocaleRoute } from './infra/resources/routing';
export function proxy(request: NextRequest) {
  const route = resolveLocaleRoute(
    request.nextUrl.pathname,
    request.nextUrl.searchParams.getAll('lang')
  );
  if (route.kind === 'invalid') {
    const destination = request.nextUrl.clone();
    destination.pathname = '/' + DEFAULT_TEXT_LOCALE + NOT_FOUND_ROUTE;
    destination.search = '';
    return NextResponse.rewrite(destination, { status: 404 });
  }
  if (route.kind === 'pass') return NextResponse.next();
  const destination = request.nextUrl.clone();
  destination.pathname = route.pathname;
  return NextResponse.rewrite(destination);
}
// Static assets and versioned resource/API URLs are not localized.
export const config = { matcher: ['/((?!_next|resources|api|.*\\..*).*)'] };
