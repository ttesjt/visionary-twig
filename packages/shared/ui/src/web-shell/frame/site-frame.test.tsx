import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteFrame } from './site-frame.js';
import { SiteFooter } from '../footer/site-footer.js';
import { SiteSidebar } from '../sidebar/site-sidebar.js';
import { PageStatus } from '../status/page-status.js';

describe('site composition', () => {
  it('provides one main and an addressable keyboard skip target', () => {
    render(
      <SiteFrame
        header={<header>Brand</header>}
        footer={
          <SiteFooter
            brand="Example Site"
            linksLabel="Contact"
            links={[{ label: 'Email', href: 'mailto:hello@example.test' }]}
          />
        }
        skipLabel="Skip"
        mainId="body"
      >
        <h1>Page</h1>
      </SiteFrame>
    );
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'body');
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('link', { name: 'Skip' })).toHaveAttribute('href', '#body');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute(
      'href',
      'mailto:hello@example.test'
    );
  });

  it('announces loading while keeping failure presentation controlled by the caller', () => {
    render(
      <>
        <PageStatus kind="loading" title="Loading" />
        <PageStatus kind="error" title="Unavailable" action={<a href="#retry">Try again</a>}>
          <p>Readable reason</p>
        </PageStatus>
      </>
    );
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Unavailable' })).toHaveTextContent(
      'Readable reason'
    );
    expect(screen.getByRole('link', { name: 'Try again' })).toBeInTheDocument();
  });
});

it('lets a full canvas own content framing while retaining one main and independent chrome', () => {
  const { container, rerender } = render(
    <SiteFrame
      contentLayout="full"
      header={<header>Brand</header>}
      footer={<footer>Footer</footer>}
      skipLabel="Skip"
    >
      <article>Canvas</article>
    </SiteFrame>
  );
  expect(screen.getAllByRole('main')).toHaveLength(1);
  expect(container.querySelector('.ui-site-frame')).toHaveAttribute('data-content-layout', 'full');
  expect(screen.getByRole('article').parentElement).toBe(screen.getByRole('main'));
  rerender(
    <SiteFrame header={<header>Brand</header>} footer={<footer>Footer</footer>} skipLabel="Skip">
      <article>Contained</article>
    </SiteFrame>
  );
  expect(container.querySelector('.ui-site-frame')).toHaveAttribute(
    'data-content-layout',
    'contained'
  );
  expect(screen.getByRole('article').parentElement).toHaveAttribute('data-width', 'content');
});

it('supports a host-owned layout class and independent navigation without header or footer', () => {
  render(
    <SiteFrame className="docs-layout" skipLabel="Skip">
      <SiteSidebar label="Documentation" items={[{ id: 'intro', href: '/', label: 'Intro' }]} />
    </SiteFrame>
  );
  expect(screen.getByRole('main').parentElement).toHaveClass('ui-site-frame', 'docs-layout');
  expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Documentation' })).toBeInTheDocument();
});
