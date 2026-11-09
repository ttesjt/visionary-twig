import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ScrollBoundaryState } from './scroll-boundary.schema.js';
import { ScrollBoundary, useScrollBoundaryState } from './scroll-boundary.js';

let top = 200;
let visible = true;
let frames: Map<number, FrameRequestCallback>;
let frameId = 0;
let resize: () => void;
const disconnect = vi.fn();
function rect() {
  return new DOMRect(0, top, 300, 400);
}
function State() {
  return <output>{useScrollBoundaryState()}</output>;
}
function flush() {
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(0));
  });
}
beforeEach(() => {
  top = 200;
  visible = true;
  frameId = 0;
  frames = new Map();
  disconnect.mockClear();
  vi.stubGlobal('IntersectionObserver', undefined);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      unobserve() {}
      disconnect = disconnect;
    }
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(rect);
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(() => ({
    length: visible ? 1 : 0,
    0: rect(),
    item() {
      return visible ? rect() : null;
    },
    [Symbol.iterator]() {
      return (visible ? [rect()] : []).values();
    },
  }));
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id);
  });
});
afterEach(() => vi.restoreAllMocks());

it('keeps SSR content readable and never guesses an active state before measurement', () => {
  const html = renderToStaticMarkup(
    <ScrollBoundary>
      <p>Readable content</p>
    </ScrollBoundary>
  );
  expect(html).toContain('data-scroll-boundary-state="pending"');
  expect(html).toContain('Readable content');
  expect(html).not.toContain('style=');
});
it('detects jumps over the viewport, reverse scroll and a bounded end without observers', () => {
  const changes = vi.fn<(state: ScrollBoundaryState) => void>();
  render(
    <ScrollBoundary range="within" onStateChange={changes}>
      <State />
    </ScrollBoundary>
  );
  expect(screen.getByRole('status')).toHaveTextContent('before');
  top = -50;
  fireEvent.scroll(document);
  flush();
  expect(screen.getByRole('status')).toHaveTextContent('active');
  top = -1000;
  fireEvent.scroll(document);
  flush();
  expect(screen.getByRole('status')).toHaveTextContent('after');
  top = 200;
  fireEvent.scroll(document);
  flush();
  expect(screen.getByRole('status')).toHaveTextContent('before');
  expect(changes.mock.calls.map(([state]) => state)).toEqual([
    'before',
    'active',
    'after',
    'before',
  ]);
});
it('reads an already-passed initial position and keeps past-start active after the element ends', () => {
  top = -1000;
  render(
    <ScrollBoundary>
      <State />
    </ScrollBoundary>
  );
  expect(screen.getByRole('status')).toHaveTextContent('active');
});
it('deduplicates notifications and uses the latest callback without resubscribing it', () => {
  const first = vi.fn();
  const latest = vi.fn();
  const { rerender } = render(
    <ScrollBoundary onStateChange={first}>
      <State />
    </ScrollBoundary>
  );
  rerender(
    <ScrollBoundary onStateChange={latest}>
      <State />
    </ScrollBoundary>
  );
  fireEvent.scroll(document);
  flush();
  expect(first).toHaveBeenCalledTimes(1);
  expect(latest).not.toHaveBeenCalled();
  top = -50;
  fireEvent.scroll(document);
  flush();
  expect(latest).toHaveBeenCalledExactlyOnceWith('active');
});
it('shares a frame across multiple boundaries and cleans pending work when the final subscriber unmounts', () => {
  const { unmount } = render(
    <>
      <ScrollBoundary>One</ScrollBoundary>
      <ScrollBoundary>Two</ScrollBoundary>
    </>
  );
  fireEvent.scroll(document);
  fireEvent.scroll(document);
  fireEvent.resize(window);
  expect(frames.size).toBe(1);
  unmount();
  expect(frames.size).toBe(0);
  expect(disconnect).toHaveBeenCalledTimes(1);
  fireEvent.scroll(document);
  expect(frames.size).toBe(0);
});
it('remeasures layout changes and resets disabled/hidden content without retaining an old active state', () => {
  const { rerender } = render(
    <ScrollBoundary>
      <State />
    </ScrollBoundary>
  );
  top = -50;
  act(() => resize());
  flush();
  expect(screen.getByRole('status')).toHaveTextContent('active');
  rerender(
    <ScrollBoundary disabled>
      <State />
    </ScrollBoundary>
  );
  expect(screen.getByRole('status')).toHaveTextContent('disabled');
  visible = false;
  rerender(
    <ScrollBoundary>
      <State />
    </ScrollBoundary>
  );
  expect(screen.getByRole('status')).toHaveTextContent('pending');
  visible = true;
  top = 200;
  fireEvent.load(document);
  flush();
  expect(screen.getByRole('status')).toHaveTextContent('before');
});
it('uses a custom root scrollport, root borders and reconfigurable offsets', () => {
  const root = document.createElement('div');
  document.body.append(root);
  Object.defineProperties(root, { clientHeight: { value: 200 }, clientTop: { value: 2 } });
  root.getBoundingClientRect = () => new DOMRect(0, 100, 400, 200);
  top = 180;
  const { rerender, unmount } = render(
    <ScrollBoundary scrollRoot={root} offset={40}>
      <State />
    </ScrollBoundary>,
    { container: root }
  );
  expect(screen.getByRole('status')).toHaveTextContent('before');
  rerender(
    <ScrollBoundary scrollRoot={root} offset={100}>
      <State />
    </ScrollBoundary>
  );
  expect(screen.getByRole('status')).toHaveTextContent('active');
  unmount();
  root.remove();
});

it('reads a live reference coordinate on every geometry update without a React reconfiguration', () => {
  let edge = 250;
  render(
    <ScrollBoundary getOffset={() => edge}>
      <State />
    </ScrollBoundary>
  );
  expect(screen.getByRole('status')).toHaveTextContent('active');
  edge = 100;
  fireEvent.resize(window);
  flush();
  expect(screen.getByRole('status')).toHaveTextContent('before');
});
