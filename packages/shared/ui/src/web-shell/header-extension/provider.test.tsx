import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { controlExtensionFrames } from '../../../test/web-shell/header-extension-motion.js';
import { SiteHeader } from '../header/site-header.js';
import { HeaderExtensionProvider } from './provider.js';
import { HeaderExtension, useHeaderExtension } from './use-header-extension.js';
import type { HeaderExtensionLease } from './registry.js';

const header = (
  <SiteHeader
    brand={{ label: 'Example', href: '/' }}
    items={[]}
    labels={{ navigation: 'Main', openMenu: 'Menu', closeMenu: 'Close', menuTitle: 'Navigation' }}
  />
);
function Capture({
  resource,
  capture,
}: {
  readonly resource: string;
  readonly capture: (lease: HeaderExtensionLease) => void;
}) {
  const lease = useHeaderExtension(resource, { content: <button>{resource}</button> });
  useEffect(() => {
    if (lease) capture(lease);
  }, [lease, capture]);
  return null;
}
const frames = controlExtensionFrames();

describe('Header registration lifecycle', () => {
  it('supports defaults and releases an unmounted contribution', async () => {
    function Example({ mounted }: { readonly mounted: boolean }) {
      return (
        <HeaderExtensionProvider scope="page">
          {header}
          {mounted && (
            <HeaderExtension resourceKey="resource">
              <button>Context action</button>
            </HeaderExtension>
          )}
        </HeaderExtensionProvider>
      );
    }
    const { container, rerender } = render(<Example mounted />);
    expect(container.querySelector('header')).toHaveAttribute(
      'data-extension-presentation',
      'integrated'
    );
    await frames.advance(3);
    expect(screen.getByRole('button', { name: 'Context action' })).toBeVisible();
    rerender(<Example mounted={false} />);
    expect(screen.queryByRole('button', { name: 'Context action' })).toBeNull();
    await frames.advance(3);
    expect(container.querySelector('.ui-site-header-extension-content')).toBeNull();
  });
  it('invalidates reused-component and retained-route leases immediately on resource/scope changes', async () => {
    const captures: HeaderExtensionLease[] = [];
    const capture = (lease: HeaderExtensionLease) => captures.push(lease);
    const content = (scope: string, resource: string) => (
      <HeaderExtensionProvider scope={scope}>
        {header}
        <Capture resource={resource} capture={capture} />
      </HeaderExtensionProvider>
    );
    const { rerender } = render(content('page-a', 'Resource A'));
    await frames.advance(3);
    expect(captures).toHaveLength(1);
    const first = captures[0];
    rerender(content('page-a', 'Resource B'));
    await frames.advance(3);
    expect(captures).toHaveLength(2);
    expect(first?.signal.aborted).toBe(true);
    act(() => {
      expect(first?.update({ content: 'Late A' })).toBe(false);
      first?.release();
    });
    await frames.advance(3);
    expect(screen.getByRole('button', { name: 'Resource B' })).toBeVisible();
    rerender(content('page-b', 'Resource B'));
    expect(captures).toHaveLength(2);
    expect(captures[1]?.signal.aborted).toBe(true);
    act(() => {
      captures[1]?.release();
    });
    expect(screen.queryByRole('button', { name: 'Resource B' })).toBeNull();
    rerender(content('page-b', 'Resource C'));
    await frames.advance(3);
    expect(captures).toHaveLength(3);
    await frames.advance(3);
    expect(screen.getByRole('button', { name: 'Resource C' })).toBeVisible();
  });
  it('survives StrictMode replay and rejects callbacks after the complete provider unmounts', async () => {
    const captures: HeaderExtensionLease[] = [];
    const capture = (lease: HeaderExtensionLease) => captures.push(lease);
    const { unmount } = render(
      <StrictMode>
        <HeaderExtensionProvider scope="page">
          {header}
          <Capture resource="Current" capture={capture} />
        </HeaderExtensionProvider>
      </StrictMode>
    );
    await frames.advance(3);
    expect(screen.getByRole('button', { name: 'Current' })).toBeVisible();
    const active = captures.at(-1);
    expect(active?.signal.aborted).toBe(false);
    unmount();
    expect(active?.signal.aborted).toBe(true);
    expect(active?.update({ content: 'Late' })).toBe(false);
  });
});
