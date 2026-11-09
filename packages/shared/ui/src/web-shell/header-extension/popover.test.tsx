import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HeaderExtensionPopover } from './popover.js';
import { HeaderExtensionSurfaceContext } from './surface-context.js';

function Example({ interactive }: { readonly interactive: boolean }) {
  return (
    <HeaderExtensionSurfaceContext value={interactive}>
      <HeaderExtensionPopover trigger="Chapters" label="Section choices">
        <a href="#chapter">Read chapter</a>
      </HeaderExtensionPopover>
    </HeaderExtensionSurfaceContext>
  );
}

describe('extension-owned popover lifecycle', () => {
  it('exposes an explicit match-trigger width hook without changing native ownership', () => {
    const { container } = render(
      <HeaderExtensionSurfaceContext value={true}>
        <HeaderExtensionPopover trigger="Sections" label="Choose section" width="trigger">
          <a href="#first">First</a>
        </HeaderExtensionPopover>
      </HeaderExtensionSurfaceContext>
    );
    expect(container.querySelector('.ui-header-extension-popover-panel')).toHaveAttribute(
      'data-width',
      'trigger'
    );
  });
  it('uses native invoker ownership and closes when the surface becomes non-interactive', () => {
    const { rerender, container } = render(<Example interactive />);
    const panel = container.querySelector('.ui-header-extension-popover-panel');
    const button = screen.getByRole('button', { name: 'Chapters' });
    expect(panel).toHaveAttribute('popover', 'auto');
    expect(panel).toHaveAttribute('data-width', 'content');
    expect(button).toHaveAttribute('popovertarget', panel?.id);
    const hide = vi.fn();
    Object.defineProperty(panel, 'hidePopover', { configurable: true, value: hide });
    rerender(<Example interactive={false} />);
    expect(button).toBeDisabled();
    expect(hide).toHaveBeenCalled();
  });

  it('dismisses hidden responsive triggers and removes its resize listener', () => {
    const { container, unmount } = render(<Example interactive />);
    const panel = container.querySelector('.ui-header-extension-popover-panel');
    const hide = vi.fn();
    Object.defineProperty(panel, 'hidePopover', { configurable: true, value: hide });
    // JSDOM's unlaid-out trigger has no client rects, like a display:none trigger.
    fireEvent(window, new Event('resize'));
    expect(hide).toHaveBeenCalled();
    unmount();
    hide.mockClear();
    fireEvent(window, new Event('resize'));
    expect(hide).not.toHaveBeenCalled();
  });
});
