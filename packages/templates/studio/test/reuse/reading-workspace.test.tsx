import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ReadingWorkspace } from './reading-workspace';
import { createReadingAdapter } from './reading-adapter';
const preview = vi.fn(() => Promise.resolve({ ok: true as const, url: '/preview/reading' }));
it('reuses the same record layout/controller with nested fields, custom identity and delayed persistence', async () => {
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const adapter = createReadingAdapter(() => pending);
  render(<ReadingWorkspace adapter={adapter} preview={preview} />);
  const headline = screen.getByRole('textbox', { name: 'Reading headline' });
  fireEvent.change(headline, { target: { value: 'Submitted reading' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save reading' }));
  expect(screen.getByLabelText('Reading operation')).toHaveTextContent('saving');
  expect(screen.getByRole('button', { name: 'Save reading' })).toBeDisabled();
  expect(adapter.getSnapshot()[0]?.details.heading).toBe('Star charts');
  fireEvent.change(headline, { target: { value: 'Newer reading draft' } });
  await act(async () => {
    release?.();
    await pending;
  });
  await waitFor(() =>
    expect(screen.getByLabelText('Reading operation')).toHaveTextContent('saved')
  );
  expect(adapter.getSnapshot()[0]?.details.heading).toBe('Submitted reading');
  expect(headline).toHaveValue('Newer reading draft');
  expect(screen.getByRole('region', { name: 'Reading card' })).toHaveTextContent(
    'Newer reading draft'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Garden notes' }));
  expect(screen.getByRole('dialog')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
  expect(headline).toHaveValue('Newer reading draft');
  fireEvent.click(screen.getByRole('button', { name: 'Open source' }));
  const json = screen.getByRole('textbox', { name: 'Layout document' });
  fireEvent.change(json, { target: { value: '{reading draft' } });
  fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
  fireEvent.click(screen.getByRole('tab', { name: 'JSON' }));
  expect(json).toHaveValue('{reading draft');
  fireEvent.click(screen.getByRole('button', { name: 'Back to reading' }));
  expect(headline).toHaveValue('Newer reading draft');
});
it('preserves the same custom field UI after failure and allows an asynchronous retry', async () => {
  const beforeWrite = vi
    .fn<() => Promise<void>>()
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue(undefined);
  const adapter = createReadingAdapter(beforeWrite);
  render(<ReadingWorkspace adapter={adapter} preview={preview} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Reading headline' }), {
    target: { value: 'Retry reading' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save reading' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Reading operation')).toHaveTextContent('unavailable')
  );
  expect(screen.getByRole('textbox', { name: 'Reading headline' })).toHaveValue('Retry reading');
  expect(adapter.getSnapshot()[0]?.details.heading).toBe('Star charts');
  fireEvent.click(screen.getByRole('button', { name: 'Save reading' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Reading operation')).toHaveTextContent('saved')
  );
  expect(adapter.getSnapshot()[0]?.details.heading).toBe('Retry reading');
});
