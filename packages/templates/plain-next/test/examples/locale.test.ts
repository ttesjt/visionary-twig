import { describe, it, expect } from 'vitest';
import { resolveLocaleRoute, localeHref } from '../../src/infra/resources/routing';
describe('one initial route locale', () => {
  it('keeps public paths and chooses one internal locale segment before rendering', () => {
    expect(resolveLocaleRoute('/', [])).toEqual({ kind: 'rewrite', locale: 'en', pathname: '/en' });
    expect(resolveLocaleRoute('/examples/text/ssr', ['zh'])).toEqual({
      kind: 'rewrite',
      locale: 'zh',
      pathname: '/zh/examples/text/ssr',
    });
    expect(resolveLocaleRoute('/zh/examples/text/ssr', [])).toEqual({ kind: 'pass', locale: 'zh' });
    expect(resolveLocaleRoute('/zh/examples/text/ssr', ['zh'])).toEqual({
      kind: 'pass',
      locale: 'zh',
    });
  });
  it('rejects ambiguous, unsupported and conflicting locale declarations', () => {
    for (const values of [['unknown'], ['en', 'zh'], ['']])
      expect(resolveLocaleRoute('/', values)).toEqual({ kind: 'invalid' });
    expect(resolveLocaleRoute('/zh/examples/text/ssr', ['en'])).toEqual({ kind: 'invalid' });
  });
  it('preserves the committed locale in links without changing default URLs', () => {
    expect(localeHref('/examples/text/ssr', 'en')).toBe('/examples/text/ssr');
    expect(localeHref('/examples/text/ssr', 'zh')).toBe('/examples/text/ssr?lang=zh');
    expect(() => localeHref('/', 'unknown')).toThrow();
  });
});
