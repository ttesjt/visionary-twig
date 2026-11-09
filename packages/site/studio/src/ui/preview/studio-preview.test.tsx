import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { newDocument } from '../session/new-document.js';
import { StudioPreview } from './studio-preview.js';
import type { StudioPreviewAdapter } from './preview-contract.js';

const props = {
  document: newDocument('preview-empty'),
  context: {},
  sessionKey: 1,
  enabled: true,
  theme: 'light' as const,
  automatic: true,
};
describe('empty page preview', () => {
  it('shows a compact empty state without requesting a frame, restores rendering when content exists, and clears a previous frame when emptied', async () => {
    const adapter = vi.fn<StudioPreviewAdapter>(() =>
      Promise.resolve({
        ok: true,
        url: '/preview/content',
      })
    );
    const { rerender, container } = render(<StudioPreview {...props} adapter={adapter} empty />);
    expect(screen.getByRole('status')).toHaveTextContent('Nothing to preview yet.');
    expect(screen.getByRole('button', { name: 'Refresh actual preview' })).toBeDisabled();
    expect(container.querySelector('iframe')).toBeNull();
    expect(adapter).not.toHaveBeenCalled();
    rerender(<StudioPreview {...props} adapter={adapter} empty={false} />);
    await waitFor(() =>
      expect(screen.getByTitle('Actual content page')).toHaveAttribute('src', '/preview/content')
    );
    expect(adapter).toHaveBeenCalledOnce();
    rerender(<StudioPreview {...props} adapter={adapter} empty />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Nothing to preview yet.');
  });
  it('keeps disabled previews distinct from empty content', () => {
    render(<StudioPreview {...props} adapter={undefined} empty enabled={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('not configured');
    expect(screen.queryByText('Nothing to preview yet.')).toBeNull();
  });
  it('does not revive a late snapshot after becoming empty', async () => {
    let finish: (value: { ok: true; url: string }) => void = () => {};
    const pending = new Promise<{ ok: true; url: string }>((resolve) => {
      finish = resolve;
    });
    const adapter = vi.fn<StudioPreviewAdapter>(() => pending);
    const { rerender, container } = render(<StudioPreview {...props} adapter={adapter} />);
    rerender(<StudioPreview {...props} adapter={adapter} empty />);
    await act(async () => {
      finish({ ok: true, url: '/preview/obsolete' });
      await pending;
    });
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Nothing to preview yet.');
  });
});
