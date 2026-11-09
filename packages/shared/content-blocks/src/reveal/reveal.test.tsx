import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reveal } from './reveal.js';
import { revealPropsSchema } from './reveal.schema.js';
import { Anchor } from '../navigation/anchor.js';

let callback: IntersectionObserverCallback;
let motionChange: () => void;
let reduceMotion = false;
const disconnect = vi.fn();
beforeEach(() => {
  reduceMotion = false;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top: 2000,
    bottom: 2100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: 2000,
    toJSON() {
      return {};
    },
  });
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(handler: IntersectionObserverCallback) {
        callback = handler;
      }
      observe() {}
      disconnect = disconnect;
    }
  );
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return reduceMotion;
    },
    addEventListener(_type: string, listener: () => void) {
      motionChange = listener;
    },
    removeEventListener() {},
  }));
});
afterEach(() => {
  vi.restoreAllMocks();
  history.replaceState(null, '', '/');
});
function intersect(element: Element, visible: boolean) {
  // Only the fields consumed by the callback are supplied by this test observer.
  const entry = { target: element, isIntersecting: visible };
  act(() => callback([entry as IntersectionObserverEntry], {} as IntersectionObserver));
}

describe('progressive reveal', () => {
  it('emits readable SSR and native focusable fragment targets', () => {
    const html = renderToStaticMarkup(
      <Anchor name="details">
        <Reveal>
          <p>Details</p>
        </Reveal>
      </Anchor>
    );
    expect(html).toContain('id="details" tabindex="-1"');
    expect(html).toContain('data-reveal-state="idle"');
    expect(html).not.toMatch(/aria-hidden|hidden=|style=/);
  });
  it('reveals once, while repeat mode hides again after leaving the viewport', () => {
    const { container, rerender } = render(
      <Reveal>
        <p>Study</p>
      </Reveal>
    );
    const element = container.querySelector('.ui-reveal');
    if (!element) throw new Error('Missing reveal');
    expect(element).toHaveAttribute('data-reveal-state', 'waiting');
    intersect(element, true);
    expect(element).toHaveAttribute('data-reveal-state', 'visible');
    expect(disconnect).toHaveBeenCalled();
    rerender(
      <Reveal once={false}>
        <p>Study</p>
      </Reveal>
    );
    intersect(element, true);
    intersect(element, false);
    expect(element).toHaveAttribute('data-reveal-state', 'waiting');
  });
  it('reveals focused content immediately and responds to motion preference changes', () => {
    const { container } = render(
      <Reveal>
        <button>Open study</button>
      </Reveal>
    );
    const element = container.querySelector('.ui-reveal');
    act(() => {
      reduceMotion = true;
      motionChange();
    });
    expect(element).toHaveAttribute('data-reveal-state', 'idle');
    act(() => {
      reduceMotion = false;
      motionChange();
    });
    expect(element).toHaveAttribute('data-reveal-state', 'waiting');
    fireEvent.focusIn(screen.getByRole('button'));
    expect(element).toHaveAttribute('data-reveal-state', 'visible');
  });
  it('reveals a hash destination nested inside waiting content', () => {
    const { container } = render(
      <Reveal>
        <Anchor name="destination">Destination</Anchor>
      </Reveal>
    );
    history.replaceState(null, '', '#destination');
    fireEvent(window, new HashChangeEvent('hashchange'));
    expect(container.querySelector('.ui-reveal')).toHaveAttribute('data-reveal-state', 'visible');
  });
  it('leaves content visible when observers are unsupported', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<Reveal>Visible fallback</Reveal>);
    expect(container.querySelector('.ui-reveal')).toHaveAttribute('data-reveal-state', 'idle');
  });
  it('rejects arbitrary CSS-like animation configuration', () => {
    expect(revealPropsSchema.safeParse({ duration: '400ms' }).success).toBe(false);
    expect(revealPropsSchema.safeParse({ effect: 'rise', distance: 64 }).success).toBe(false);
  });
});
