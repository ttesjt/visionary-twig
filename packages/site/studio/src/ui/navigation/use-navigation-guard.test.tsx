import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useStudioNavigationGuard } from './use-navigation-guard.js';
import { StudioDiscardDialog } from './discard-dialog.js';
it('keeps an explicit action pending until confirmation, and cancellation retains the draft', () => {
  const action = vi.fn();
  function Host() {
    const guard = useStudioNavigationGuard({ when: true });
    return (
      <>
        <button onClick={() => guard.request(action)}>Select another row</button>
        <StudioDiscardDialog guard={guard} />
      </>
    );
  }
  render(<Host />);
  fireEvent.click(screen.getByRole('button', { name: 'Select another row' }));
  expect(action).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
  expect(action).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Select another row' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  expect(action).toHaveBeenCalledOnce();
});
it('guards unload and ordinary links but respects permitted routes, modified clicks and new tabs', () => {
  const navigate = vi.fn();
  const hook = renderHook(() =>
    useStudioNavigationGuard({
      when: true,
      navigate,
      allow: (url) => url.pathname === '/permitted',
    })
  );
  const anchor = document.createElement('a');
  anchor.href = '/leave';
  anchor.addEventListener('click', (event) => event.preventDefault());
  document.body.append(anchor);
  const unload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  fireEvent.click(anchor, { ctrlKey: true });
  expect(hook.result.current.pending).toBe(false);
  anchor.target = '_blank';
  fireEvent.click(anchor);
  expect(hook.result.current.pending).toBe(false);
  anchor.target = '_self';
  anchor.href = '/permitted';
  fireEvent.click(anchor);
  expect(hook.result.current.pending).toBe(false);
  anchor.href = '/leave';
  fireEvent.click(anchor);
  expect(hook.result.current.pending).toBe(true);
  act(() => hook.result.current.confirm());
  expect(navigate).toHaveBeenCalledWith(new URL('/leave', location.href).href);
  anchor.remove();
});
it('clean sessions run actions immediately without opening confirmation', () => {
  const action = vi.fn();
  const { result } = renderHook(() => useStudioNavigationGuard({ when: false }));
  act(() => result.current.request(action));
  expect(action).toHaveBeenCalledOnce();
  expect(result.current.pending).toBe(false);
});
