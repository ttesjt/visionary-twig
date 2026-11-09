import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteHeader } from './site-header.js';
import type { SiteHeaderBrand } from './site-brand.js';

const labels = { navigation: 'Main', openMenu: 'Menu', closeMenu: 'Close', menuTitle: 'Pages' };
const image = { url: '/brand.svg', width: 320, height: 80 };

it('defaults to flow and uses a host-owned class with explicit sticky positioning', () => {
  const brand = { label: 'Example', href: '/' };
  const { rerender } = render(<SiteHeader brand={brand} labels={labels} items={[]} />);
  expect(screen.getByRole('banner')).toHaveAttribute('data-position', 'flow');
  rerender(
    <SiteHeader
      brand={brand}
      labels={labels}
      items={[]}
      className="docs-header"
      position="sticky"
    />
  );
  expect(screen.getByRole('banner')).toHaveClass('ui-site-header', 'docs-header');
  expect(screen.getByRole('banner')).toHaveAttribute('data-position', 'sticky');
});

describe('Header Home identity', () => {
  it.each([
    { label: 'Back to the beginning', href: '/' },
    { label: 'Back to the beginning', href: '/', display: 'image', image },
    { label: 'Back to the beginning', href: '/', display: 'image-text', image },
  ] satisfies SiteHeaderBrand[])('keeps an independently named Home link for $display', (brand) => {
    render(<SiteHeader brand={brand} labels={labels} items={[]} />);
    const home = screen.getByRole('link', { name: brand.label });
    expect(home).toHaveAttribute('href', '/');
    expect(home.textContent).toBe(brand.display === 'image' ? '' : brand.label);
    const logo = home.querySelector('img');
    if (brand.display) {
      expect(logo).toHaveAttribute('src', image.url);
      expect(logo).toHaveAttribute('width', String(image.width));
      expect(logo).toHaveAttribute('height', String(image.height));
      expect(logo).toHaveAttribute('alt', '');
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    } else expect(logo).toBeNull();
  });
});
