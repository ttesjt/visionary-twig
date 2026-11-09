import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { controlExtensionFrames } from '../../../test/web-shell/header-extension-motion.js';
import { HeaderExtensionProvider } from './provider.js';
import { HeaderExtensionSurface } from './surface.js';
import { HeaderExtension, useHeaderExtension } from './use-header-extension.js';
import type { HeaderExtensionLease, HeaderExtensionValue } from './registry.js';

const main = <button>Main action</button>;
function Contributor({
  resource,
  value,
  capture,
}: {
  readonly resource: string;
  readonly value: HeaderExtensionValue;
  readonly capture: (lease: HeaderExtensionLease) => void;
}) {
  const lease = useHeaderExtension(resource, value);
  useEffect(() => {
    if (lease) capture(lease);
  }, [lease, capture]);
  return null;
}

const frames = controlExtensionFrames();

describe('Header extension content group', () => {
  it('defaults to compact without rendering an unused bottom row', async () => {
    const { container } = render(
      <HeaderExtensionProvider scope="page">
        <HeaderExtensionSurface />
        <HeaderExtension resourceKey="item">{main}</HeaderExtension>
      </HeaderExtensionProvider>
    );
    await frames.advance(3);
    expect(screen.getByRole('button', { name: 'Main action' })).toBeVisible();
    expect(container.querySelector('.ui-site-header-extension')).toHaveAttribute(
      'data-density',
      'compact'
    );
    expect(container.querySelector('.ui-site-header-extension-bottom')).toBeNull();
  });

  it('updates density and bottom independently of stable main content without changing ownership', async () => {
    const leases: HeaderExtensionLease[] = [];
    const capture = (lease: HeaderExtensionLease) => leases.push(lease);
    function Example({ value }: { readonly value: HeaderExtensionValue }) {
      return (
        <HeaderExtensionProvider scope="page">
          <HeaderExtensionSurface />
          <Contributor resource="item" value={value} capture={capture} />
        </HeaderExtensionProvider>
      );
    }
    const { container, rerender } = render(<Example value={{ content: main }} />);
    await frames.advance(3);
    expect(leases).toHaveLength(1);
    const group = container.querySelector('.ui-site-header-extension-group');
    const footer = <progress aria-label="Reading" value={0.2} />;
    rerender(<Example value={{ content: main, bottom: footer }} />);
    await frames.advance(3);
    expect(screen.getByRole('progressbar', { name: 'Reading' })).toHaveAttribute('value', '0.2');
    // Each option changes on its own: neither can rely on another dependency changing too.
    rerender(<Example value={{ content: main, bottom: footer, density: 'comfortable' }} />);
    expect(container.querySelector('.ui-site-header-extension')).toHaveAttribute(
      'data-density',
      'comfortable'
    );
    const updatedFooter = <progress aria-label="Reading" value={0.8} />;
    rerender(<Example value={{ content: main, bottom: updatedFooter, density: 'comfortable' }} />);
    expect(screen.getByRole('progressbar', { name: 'Reading' })).toHaveAttribute('value', '0.8');
    rerender(<Example value={{ content: main, bottom: updatedFooter, density: 'flush' }} />);
    expect(container.querySelector('.ui-site-header-extension')).toHaveAttribute(
      'data-density',
      'flush'
    );
    expect(container.querySelector('.ui-site-header-extension-group')).toBe(group);
    expect(leases).toHaveLength(1);
    expect(leases[0]?.signal.aborted).toBe(false);
    rerender(<Example value={{ content: main, density: 'flush' }} />);
    expect(container.querySelector('.ui-site-header-extension-bottom')).toBeNull();
    rerender(<Example value={{ content: main }} />);
    expect(container.querySelector('.ui-site-header-extension')).toHaveAttribute(
      'data-density',
      'compact'
    );
  });

  it('clears both slots across resource, scope and unmount boundaries', async () => {
    const leases: HeaderExtensionLease[] = [];
    const capture = (lease: HeaderExtensionLease) => leases.push(lease);
    function Example({
      scope,
      resource,
      mounted = true,
    }: {
      readonly scope: string;
      readonly resource: string;
      readonly mounted?: boolean;
    }) {
      return (
        <HeaderExtensionProvider scope={scope}>
          <HeaderExtensionSurface />
          {mounted && (
            <Contributor
              resource={resource}
              capture={capture}
              value={{
                content: resource,
                bottom: <button>{resource + ' footer'}</button>,
                density: 'comfortable',
              }}
            />
          )}
        </HeaderExtensionProvider>
      );
    }
    const { container, rerender } = render(<Example scope="page" resource="First" />);
    await frames.advance(3);
    expect(screen.getByRole('button', { name: 'First footer' })).toBeVisible();
    rerender(<Example scope="page" resource="Second" />);
    await frames.advance(3);
    expect(screen.getByRole('button', { name: 'Second footer' })).toBeVisible();
    act(() => {
      expect(leases[0]?.update({ content: 'Late', bottom: 'Late footer', density: 'flush' })).toBe(
        false
      );
      leases[0]?.release();
    });
    expect(screen.queryByText('First')).toBeNull();
    expect(screen.getByRole('button', { name: 'Second footer' })).toBeVisible();
    rerender(<Example scope="next" resource="Second" />);
    expect(container.querySelector('.ui-site-header-extension-group')).toBeNull();
    expect(leases.at(-1)?.signal.aborted).toBe(true);
    rerender(<Example scope="next" resource="Third" />);
    await frames.advance(3);
    expect(screen.getByRole('button', { name: 'Third footer' })).toBeVisible();
    rerender(<Example scope="next" resource="Third" mounted={false} />);
    expect(screen.queryByRole('button', { name: 'Third footer' })).toBeNull();
    await frames.advance(3);
    expect(container.querySelector('.ui-site-header-extension-group')).toBeNull();
  });

  it('supports bottom-only updates on the declarative contributor', async () => {
    function Example({ bottom }: { readonly bottom?: string }) {
      return (
        <HeaderExtensionProvider scope="page">
          <HeaderExtensionSurface />
          <HeaderExtension resourceKey="item" density="flush" bottom={bottom}>
            {main}
          </HeaderExtension>
        </HeaderExtensionProvider>
      );
    }
    const { container, rerender } = render(<Example bottom="Footer" />);
    await frames.advance(3);
    expect(screen.getByText('Footer')).toBeVisible();
    expect(container.querySelector('.ui-site-header-extension')).toHaveAttribute(
      'data-density',
      'flush'
    );
    rerender(<Example />);
    expect(screen.queryByText('Footer')).toBeNull();
    expect(container.querySelector('.ui-site-header-extension-bottom')).toBeNull();
  });
});
