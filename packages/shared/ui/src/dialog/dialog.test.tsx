import '@testing-library/jest-dom/vitest';
import { StrictMode, createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from '../dialog.js';

// jsdom lacks the native modal methods. Only model visibility here; actual focus,
// inertness and the top layer are verified in the production browser tests.
const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    }),
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    }),
  });
});
afterEach(() => {
  cleanup();
  for (const [name, descriptor] of [
    ['showModal', originalShow],
    ['close', originalClose],
  ] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});

describe('controlled Dialog', () => {
  it('associates the rendered title/description and forwards the native ref', () => {
    const ref = createRef<HTMLDialogElement>();
    render(
      <Dialog ref={ref} open onOpenChange={vi.fn()} title="Preview" description="Image details">
        <p>Image content</p>
      </Dialog>
    );
    expect(screen.getByRole('dialog', { name: 'Preview', description: 'Image details' })).toBe(
      ref.current
    );
    expect(ref.current).toHaveAttribute('open');
  });
  it('allows an icon-only close control while preserving the accessible label', () => {
    render(
      <Dialog open onOpenChange={vi.fn()} title="Preview" closeIcon={<svg aria-hidden="true" />} />
    );
    const close = screen.getByRole('button', { name: 'Close dialog' });
    expect(close.textContent).toBe('');
    expect(close.querySelector('svg')).not.toBeNull();
  });
  it('requests closure for the close button and cancel, leaving the parent in control', () => {
    const onOpenChange = vi.fn();
    render(<Dialog open onOpenChange={onOpenChange} title="Preview" />);
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    const cancel = new Event('cancel', { cancelable: true });
    fireEvent(screen.getByRole('dialog'), cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('dialog')).toHaveAttribute('open');
  });
  it('opens/closes from props without duplicate requests, including StrictMode cleanup', () => {
    const onOpenChange = vi.fn();
    const ref = createRef<HTMLDialogElement>();
    const { rerender, unmount } = render(
      <StrictMode>
        <Dialog ref={ref} open onOpenChange={onOpenChange} title="Preview" />
      </StrictMode>
    );
    fireEvent(screen.getByRole('dialog'), new Event('close'));
    expect(onOpenChange).not.toHaveBeenCalled();
    rerender(
      <StrictMode>
        <Dialog ref={ref} open={false} onOpenChange={onOpenChange} title="Preview" />
      </StrictMode>
    );
    expect(ref.current).not.toHaveAttribute('open');
    expect(onOpenChange).not.toHaveBeenCalled();
    unmount();
    expect(ref.current).toBeNull();
  });
  it('reports a native close and removes injected runtime style', () => {
    const onOpenChange = vi.fn();
    const injected: Record<string, unknown> = { style: { width: '9999px' } };
    render(<Dialog {...injected} open onOpenChange={onOpenChange} title="Preview" />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveAttribute('style');
    dialog.removeAttribute('open');
    fireEvent(dialog, new Event('close'));
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });
  it('keeps nested cancel requests local to the inner dialog', () => {
    const outerChange = vi.fn();
    const innerChange = vi.fn();
    render(
      <Dialog open onOpenChange={outerChange} title="Outer">
        <Dialog open onOpenChange={innerChange} title="Inner" />
      </Dialog>
    );
    fireEvent(
      screen.getByRole('dialog', { name: 'Inner' }),
      new Event('cancel', { cancelable: true })
    );
    expect(innerChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(outerChange).not.toHaveBeenCalled();
  });
  it('rejects empty accessible titles and close labels', () => {
    expect(() => render(<Dialog open={false} onOpenChange={vi.fn()} title=" " />)).toThrow(
      'non-empty title'
    );
    expect(() =>
      render(<Dialog open={false} onOpenChange={vi.fn()} title="Preview" closeLabel=" " />)
    ).toThrow('non-empty closeLabel');
  });
});
