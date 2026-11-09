import { useEffect } from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ContentNavigationHeader, ContentReadingProgress } from '../navigation-surfaces.js';
import { ContentReadingContext, createReadingStore, type ReadingStore } from '../reading-store.js';
import { createNavigationCatalog, defineNavigationPreset } from './catalog.js';
import {
  createNavigationPresentationRegistry,
  NavigationPresentationSession,
  NavigationSurfaceActivityProvider,
  type NavigationItemPartProps,
  type NavigationPartProps,
} from './parts.js';
const empty = z.strictObject({});
const catalog = createNavigationCatalog({
  parts: {
    title: { custom: { schema: empty } },
    item: { custom: { schema: empty } },
    progress: { custom: { schema: empty } },
  },
  presets: {
    custom: defineNavigationPreset(empty, () => ({
      title: { id: 'custom' },
      item: { id: 'custom' },
      progress: { id: 'custom' },
    })),
  },
});
const mounts = vi.fn<(part: string) => void>();
const unmounts = vi.fn<(part: string) => void>();
const effectStarts = vi.fn<(part: string) => void>();
const effectStops = vi.fn<(part: string) => void>();
function usePartProbe(part: string, active: boolean) {
  useEffect(() => {
    mounts(part);
    return () => {
      unmounts(part);
    };
  }, [part]);
  useEffect(() => {
    if (!active) return;
    effectStarts(part);
    return () => {
      effectStops(part);
    };
  }, [part, active]);
}
function partAttributes({ active, interactive, placement }: NavigationPartProps) {
  return { 'data-active': active, 'data-interactive': interactive, 'data-placement': placement };
}
function Title(props: NavigationPartProps) {
  usePartProbe('title', props.active);
  return (
    <span data-testid="custom-title" {...partAttributes(props)}>
      {props.navigation.title}
    </span>
  );
}
function Item(props: NavigationItemPartProps) {
  usePartProbe(`item-${props.index}`, props.active);
  return (
    <span data-testid={`custom-item-${props.index}`} {...partAttributes(props)}>
      {props.item.label}
    </span>
  );
}
function Progress(props: NavigationPartProps) {
  usePartProbe('progress', props.active);
  return (
    <span
      data-testid="custom-progress"
      data-index={props.currentIndex}
      data-count={props.itemCount}
      {...partAttributes(props)}
    >
      {Math.round(props.reading.progress * 100)}
    </span>
  );
}
const registry = createNavigationPresentationRegistry(catalog, {
  title: { custom: Title },
  item: { custom: Item },
  progress: { custom: Progress },
});
const navigation = {
  label: 'Chapters',
  title: 'A small study',
  progressLabel: 'Progress',
  items: [
    { label: 'Overview', href: '#overview' },
    { label: 'Details', href: '#details' },
  ],
};
function Surface({
  store,
  active = true,
  interactive = active,
  visible = true,
}: {
  readonly store: ReadingStore;
  readonly active?: boolean;
  readonly interactive?: boolean;
  readonly visible?: boolean;
}) {
  return (
    <ContentReadingContext value={store}>
      <NavigationPresentationSession registry={registry} presentation={{ preset: 'custom' }}>
        <NavigationSurfaceActivityProvider active={active} interactive={interactive}>
          <ContentNavigationHeader {...navigation} active={visible} />
          <ContentReadingProgress label="Progress" navigation={navigation} active={visible} />
        </NavigationSurfaceActivityProvider>
      </NavigationPresentationSession>
    </ContentReadingContext>
  );
}
function visualParts() {
  return ['custom-title', 'custom-item-0', 'custom-item-1', 'custom-progress'].map((id) =>
    screen.getByTestId(id)
  );
}
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  for (const probe of [mounts, unmounts, effectStarts, effectStops]) probe.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('keeps native links, current location and progress semantics around injected visuals', () => {
  const store = createReadingStore('#overview');
  render(<Surface store={store} />);
  const overview = screen.getByRole('link', { name: 'Overview' });
  expect(overview.getAttribute('href')).toBe('#overview');
  expect(overview.getAttribute('aria-current')).toBe('location');
  expect(screen.getByTestId('custom-title').getAttribute('data-placement')).toBe('header');
  const parts = visualParts();
  act(() => store.publish({ href: '#details', progress: 0.6 }));
  expect(screen.getByRole('link', { name: 'Details' }).getAttribute('aria-current')).toBe(
    'location'
  );
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0.6');
  expect(screen.getByTestId('custom-progress').textContent).toBe('60');
  expect(screen.getByTestId('custom-progress').getAttribute('data-index')).toBe('1');
  expect(screen.getByTestId('custom-progress').getAttribute('data-count')).toBe('2');
  expect(visualParts()).toEqual(parts);
  expect(mounts).toHaveBeenCalledTimes(4);
  expect(effectStarts).toHaveBeenCalledTimes(4);
});
it('preserves every selected visual through entry/open/exit/re-entry while gating effects', () => {
  const store = createReadingStore('#overview');
  const view = render(<Surface store={store} active={false} />);
  const parts = visualParts();
  expect(mounts).toHaveBeenCalledTimes(4);
  expect(effectStarts).not.toHaveBeenCalled();
  expect(screen.getByRole('navigation').hasAttribute('inert')).toBe(true);
  for (const active of [true, false, true, false]) {
    view.rerender(<Surface store={store} active={active} />);
    expect(visualParts()).toEqual(parts);
    expect(unmounts).not.toHaveBeenCalled();
    expect(screen.getByRole('navigation').hasAttribute('inert')).toBe(!active);
    for (const part of visualParts()) expect(part.getAttribute('data-active')).toBe(String(active));
  }
  expect(effectStarts).toHaveBeenCalledTimes(8);
  expect(effectStops).toHaveBeenCalledTimes(8);
  act(() => store.publish({ href: '#details', progress: 0.6 }));
  expect(screen.getByTestId('custom-progress').textContent).toBe('60');
  expect(screen.getByTestId('custom-progress').getAttribute('data-index')).toBe('1');
  expect(screen.getByTestId('custom-progress').getAttribute('data-count')).toBe('2');
  view.unmount();
  expect(unmounts).toHaveBeenCalledTimes(4);
});
it('allows effect eligibility and interaction readiness to change independently', () => {
  const store = createReadingStore('#overview');
  const view = render(<Surface store={store} active={false} interactive />);
  const parts = visualParts();
  expect(screen.getByRole('navigation').hasAttribute('inert')).toBe(false);
  expect(effectStarts).not.toHaveBeenCalled();
  view.rerender(<Surface store={store} active interactive={false} />);
  expect(screen.getByRole('navigation').hasAttribute('inert')).toBe(true);
  expect(effectStarts).toHaveBeenCalledTimes(4);
  for (const part of visualParts()) expect(part.getAttribute('data-interactive')).toBe('false');
  expect(visualParts()).toEqual(parts);
});
it('keeps an inactive origin copy the same size/markup without starting its effects', () => {
  const store = createReadingStore('#overview');
  render(<Surface store={store} visible={false} />);
  expect(visualParts()).toHaveLength(4);
  expect(effectStarts).not.toHaveBeenCalled();
  expect(screen.getByRole('navigation').hasAttribute('inert')).toBe(true);
  for (const part of visualParts()) {
    expect(part.getAttribute('data-active')).toBe('false');
    expect(part.getAttribute('data-interactive')).toBe('false');
  }
});
it('requires renderer registration to match the pure catalog exactly', () => {
  expect(() =>
    createNavigationPresentationRegistry(catalog, { title: {}, item: {}, progress: {} })
  ).toThrow('Missing');
  expect(() =>
    createNavigationPresentationRegistry(catalog, {
      ...registry.components,
      title: { ...registry.components.title, ghost: Title },
    })
  ).toThrow('Unregistered');
});
