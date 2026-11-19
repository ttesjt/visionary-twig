import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { useAppearance } from '../../state';

const policy = {
  presets: ['paper', 'ink'],
  defaultPreset: 'paper',
  storageKey: 'fixture-appearance',
} as const;
function Picker() {
  const { appearance, setAppearance } = useAppearance(policy);
  return <button onClick={() => setAppearance('ink')}>{appearance ?? 'pending'}</button>;
}
afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.stylePreview;
  vi.restoreAllMocks();
});
it('keeps the server snapshot independent of browser state', () => {
  document.documentElement.dataset.stylePreview = 'ink';
  expect(renderToString(<Picker />)).toContain('pending');
});
it('publishes to all consumers, persists, handles cross-tab reset and releases subscriptions', async () => {
  const remove = vi.spyOn(window, 'removeEventListener');
  const { unmount } = render(
    <>
      <Picker />
      <Picker />
    </>
  );
  const first = screen.getAllByRole('button')[0];
  if (!first) throw new Error('Missing picker');
  fireEvent.click(first);
  await waitFor(() =>
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['ink', 'ink'])
  );
  expect(localStorage.getItem(policy.storageKey)).toBe('ink');
  fireEvent(window, new StorageEvent('storage', { key: 'unrelated', newValue: 'paper' }));
  expect(document.documentElement.dataset.stylePreview).toBe('ink');
  fireEvent(window, new StorageEvent('storage', { key: policy.storageKey, newValue: 'obsolete' }));
  await waitFor(() =>
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['paper', 'paper'])
  );
  fireEvent(window, new StorageEvent('storage', { key: null }));
  expect(document.documentElement.dataset.stylePreview).toBe('paper');
  unmount();
  expect(remove.mock.calls.filter(([name]) => name === 'storage')).toHaveLength(2);
});
it('keeps the selected appearance when persistence is denied', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Denied');
  });
  render(<Picker />);
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(screen.getByRole('button').textContent).toBe('ink'));
  expect(document.documentElement.dataset.stylePreview).toBe('ink');
});
