import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { controlExtensionFrames } from '../../../test/web-shell/header-extension-motion.js';
import type { HeaderExtensionSnapshot } from './registry.js';
import { useExtensionPresence } from './use-extension-presence.js';

const frames = controlExtensionFrames();
const first = { owner: 1, content: <button>First</button> } satisfies HeaderExtensionSnapshot;
const second = { owner: 2, content: <button>Second</button> } satisfies HeaderExtensionSnapshot;

function Surface({ snapshot }: { readonly snapshot: HeaderExtensionSnapshot | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const presence = useExtensionPresence(snapshot, ref);
  return (
    <div
      ref={ref}
      data-testid="surface"
      data-state={presence.phase}
      aria-hidden={!presence.interactive}
      inert={!presence.interactive}
    >
      {presence.displayed?.content}
    </div>
  );
}

function animate(element: HTMLElement) {
  let finish = () => {};
  let cancel = (_reason: Error) => {};
  const finished = new Promise<void>((resolve, reject) => {
    finish = resolve;
    cancel = reject;
  });
  Object.defineProperty(element, 'getAnimations', {
    configurable: true,
    value: () => [{ finished }],
  });
  return {
    async finish() {
      await act(async () => {
        finish();
        await finished;
      });
    },
    async cancel() {
      await act(async () => {
        cancel(new Error('Animation cancelled'));
        await finished.catch(() => {});
      });
    },
  };
}

describe('Header extension presence', () => {
  it('keeps opening content inert until frames and every animation complete', async () => {
    render(<Surface snapshot={first} />);
    const surface = screen.getByTestId('surface');
    const animation = animate(surface);
    expect(surface).toHaveAttribute('data-state', 'opening');
    expect(screen.queryByRole('button')).toBeNull();
    await frames.advance();
    expect(surface).toHaveAttribute('data-state', 'opening');
    await frames.advance();
    expect(surface).toHaveAttribute('data-state', 'expanding');
    await frames.advance();
    expect(surface).toHaveAttribute('inert');
    await animation.finish();
    expect(surface).toHaveAttribute('data-state', 'open');
    expect(screen.getByRole('button', { name: 'First' })).toBeVisible();
  });

  it.each(['finish', 'cancel'] as const)(
    'retains inert closing content until animations %s',
    async (outcome) => {
      const { rerender } = render(<Surface snapshot={first} />);
      await frames.advance(3);
      const surface = screen.getByTestId('surface');
      const animation = animate(surface);
      rerender(<Surface snapshot={null} />);
      expect(surface).toHaveAttribute('data-state', 'closing');
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.getByText('First')).toBeInTheDocument();
      await frames.advance();
      await animation[outcome]();
      expect(surface).toHaveAttribute('data-state', 'closed');
      expect(screen.queryByText('First')).toBeNull();
    }
  );

  it('settles zero-animation and reduced-motion transitions without timers', async () => {
    const { rerender } = render(<Surface snapshot={first} />);
    await frames.advance(3);
    expect(screen.getByTestId('surface')).toHaveAttribute('data-state', 'open');
    rerender(<Surface snapshot={null} />);
    await frames.advance();
    expect(screen.getByTestId('surface')).toHaveAttribute('data-state', 'closed');
  });

  it('ignores stale completion when a closing extension is replaced', async () => {
    const { rerender } = render(<Surface snapshot={first} />);
    await frames.advance(3);
    const surface = screen.getByTestId('surface');
    const oldAnimation = animate(surface);
    rerender(<Surface snapshot={null} />);
    await frames.advance();
    rerender(<Surface snapshot={second} />);
    const newAnimation = animate(surface);
    await oldAnimation.finish();
    expect(surface).toHaveAttribute('data-state', 'opening');
    await frames.advance(3);
    expect(surface).toHaveAttribute('data-state', 'expanding');
    await newAnimation.finish();
    expect(screen.getByRole('button', { name: 'Second' })).toBeVisible();
  });

  it('cancels queued frames and ignores animation completion after unmount', async () => {
    const opening = render(<Surface snapshot={first} />);
    await frames.advance();
    expect(frames.pending()).toBe(1);
    opening.unmount();
    expect(frames.pending()).toBe(0);
    const expanding = render(<Surface snapshot={second} />);
    const animation = animate(screen.getByTestId('surface'));
    await frames.advance(3);
    expanding.unmount();
    await animation.cancel();
    expect(frames.pending()).toBe(0);
    expect(screen.queryByTestId('surface')).toBeNull();
  });
});
