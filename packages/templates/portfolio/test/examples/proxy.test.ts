import { it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '../../src/proxy';
it('rewrites the real public nondefault entry and preserves RSC/search parameters', () => {
  const result = proxy(new NextRequest('http://localhost/examples/text/ssr?lang=zh&_rsc=abc'));
  const target = new URL(result.headers.get('x-middleware-rewrite') ?? 'http://invalid');
  expect(target.pathname).toBe('/zh/examples/text/ssr');
  expect(target.searchParams.get('lang')).toBe('zh');
  expect(target.searchParams.get('_rsc')).toBe('abc');
});
it('rejects conflicting locales and does not rewrite an already-localized route', () => {
  const result = proxy(new NextRequest('http://localhost/zh/?lang=en'));
  expect(result.status).toBe(404);
  const target = new URL(result.headers.get('x-middleware-rewrite') ?? 'http://invalid');
  expect(target.pathname.replace(/\/$/, '')).toBe('/en/not-found');
  expect(target.search).toBe('');
  expect(proxy(new NextRequest('http://localhost/zh/')).headers.get('x-middleware-next')).toBe('1');
});
