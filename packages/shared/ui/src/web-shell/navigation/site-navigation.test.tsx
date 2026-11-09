import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SiteNavigation } from './site-navigation.js';

const items = [
  { id: 'home', href: '#home', label: 'Home' },
  { id: 'docs', href: '#docs', label: '文档' },
];

describe('SiteNavigation', () => {
  it('keeps icon destinations named and featured markers decorative', () => {
    render(
      <SiteNavigation
        label="Shortcuts"
        presentation="compact"
        currentId="search"
        items={[
          {
            id: 'search',
            href: '/search',
            label: 'Search',
            display: 'icon',
            icon: <span>Icon</span>,
          },
          {
            id: 'updates',
            href: '/updates',
            label: 'Updates',
            display: 'featured',
            marker: <span>New</span>,
          },
        ]}
      />
    );
    expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Updates' })).toHaveAttribute('href', '/updates');
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
  it('renders visible links and a single current page without inventing routes', () => {
    render(<SiteNavigation items={items} currentId="docs" label="Main" />);
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '文档' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('closes on ordinary activation while preserving modified clicks', () => {
    const onNavigate = vi.fn();
    render(<SiteNavigation items={items} label="Main" onNavigate={onNavigate} />);
    const link = screen.getByRole('link', { name: 'Home' });
    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { metaKey: true });
    fireEvent.click(link, { shiftKey: true });
    fireEvent.click(link, { altKey: true });
    expect(onNavigate).not.toHaveBeenCalled();
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
