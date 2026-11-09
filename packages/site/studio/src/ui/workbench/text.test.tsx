import { afterEach, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StudioWorkbench } from './studio-workbench.js';
import { DEFAULT_STUDIO_TEXT } from '../text-catalog.js';
import { createProject } from '../../data/index.js';
import type { StudioPublishing } from '../../data/index.js';
import type { StudioFileOpenResult } from '../files/file-adapter.js';
import type { ReactNode } from 'react';
vi.mock('@frontend/puck-adapter/editor', () => ({ ContentEditor: () => null }));
// Native dialog behavior is covered by ui/browser tests; keep this regression about session ownership.
vi.mock('@frontend/ui/dialog', () => ({
  Dialog: ({ open, title, children }: { open: boolean; title: string; children: ReactNode }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}));
afterEach(cleanup);
it('uses supplied project, save and catalog copy through the real workbench', () => {
  render(
    <StudioWorkbench
      text={{
        ...DEFAULT_STUDIO_TEXT,
        saveAs: 'Save a working file',
        catalogTitle: 'Translations',
        publish: 'Release',
      }}
    />
  );
  expect(screen.getByRole('button', { name: 'Save a working file' })).toBeDefined();
  expect(screen.getByRole('region', { name: 'Translations' })).toBeDefined();
});

it('requires a fresh publication confirmation after an asynchronous file replacement', async () => {
  let finishOpen: (value: StudioFileOpenResult) => void = () => undefined;
  const pendingOpen = new Promise<StudioFileOpenResult>((resolve) => {
    finishOpen = resolve;
  });
  const publish = vi.fn<StudioPublishing['publish']>(() => Promise.resolve({ status: 'conflict' }));
  render(
    <StudioWorkbench
      fileAdapter={{
        open: () => pendingOpen,
        saveAs: () => Promise.resolve({ status: 'cancelled' }),
      }}
      publishing={{
        targets: [{ id: 'local', label: 'Local' }],
        load: () => Promise.resolve({ status: 'not-found' }),
        publish,
      }}
    />
  );
  fireEvent.change(screen.getByLabelText(DEFAULT_STUDIO_TEXT.publishKey), {
    target: { value: 'entry' },
  });
  fireEvent.click(screen.getByRole('button', { name: DEFAULT_STUDIO_TEXT.openFile }));
  fireEvent.click(screen.getByRole('button', { name: DEFAULT_STUDIO_TEXT.publish }));
  expect(
    screen.getByRole('dialog', { name: DEFAULT_STUDIO_TEXT.publishConfirmTitle })
  ).toBeDefined();
  await act(async () => {
    finishOpen({
      status: 'opened',
      filename: 'replacement.studio.json',
      text: JSON.stringify(createProject('replacement')),
      location: { name: 'replacement.studio.json', write: () => Promise.resolve() },
    });
    await pendingOpen;
  });
  expect(
    screen.queryByRole('dialog', { name: DEFAULT_STUDIO_TEXT.publishConfirmTitle })
  ).toBeNull();
  expect(screen.getByText(/replacement.studio.json · ID: replacement/)).toBeDefined();
  expect(publish).not.toHaveBeenCalled();
});
