import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { StudioLink } from './studio-link';
import { studioPathname } from './studio-url';
vi.mock('../../site/text', async (original) => ({
  ...(await original<typeof import('../../site/text')>()),
  TEXT_LOCALES: ['en', 'zh'],
}));
vi.mock('next/navigation', () => ({ useParams: () => ({ locale: 'zh' }) }));
it('preserves the route locale, query and anchor in a bilingual host', () => {
  render(<StudioLink href="/demo/pages/new?item=field-guide#editor">Open</StudioLink>);
  expect(screen.getByRole('link').getAttribute('href')).toBe(
    '/zh/demo/pages/new?item=field-guide#editor'
  );
  expect(studioPathname('/zh/demo/pages/new')).toBe('/demo/pages/new');
  expect(studioPathname('/zh')).toBe('/');
  expect(studioPathname('/zh-not-a-locale')).toBe('/zh-not-a-locale');
});
