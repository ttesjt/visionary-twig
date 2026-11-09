import '@testing-library/jest-dom/vitest';
import '../../test/native-dialog.js';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaViewer } from '../viewer.js';

const images = [
  { id: 'a', src: '/a.png', alt: 'A', width: 20, height: 10 },
  { id: 'b', src: '/b.png', alt: 'B', width: 20, height: 10 },
];
describe('controlled MediaViewer', () => {
  it('uses the photo engine with display resources and replaces removed images without exposing originals', () => {
    const props = {
      open: true,
      currentId: 'a',
      onCurrentChange: vi.fn(),
      onOpenChange: vi.fn(),
      label: 'Preview',
    };
    const data = [
      {
        ...images[0],
        id: 'a',
        src: '/a.png',
        alt: 'A',
        width: 20,
        height: 10,
        original: { url: '/original.png', width: 40, height: 20 },
      },
    ];
    const { rerender } = render(<MediaViewer {...props} images={data} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-viewer-engine', 'react-photo-view');
    expect(screen.getByRole('img')).toHaveAttribute('src', '/a.png');
    expect(document.querySelector('img[src="/original.png"]')).toBeNull();
    rerender(
      <MediaViewer
        {...props}
        images={data.map((image) => ({ ...image, caption: 'Updated caption' }))}
      />
    );
    expect(screen.getByText('Updated caption')).toBeVisible();
    rerender(
      <MediaViewer {...props} images={data.map((image) => ({ ...image, src: '/updated.png' }))} />
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', '/updated.png');
    rerender(<MediaViewer {...props} images={images} currentId="b" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/b.png');
  });
  it('emits navigation requests without mutating controlled state, including from the close control', async () => {
    const change = vi.fn();
    const close = vi.fn();
    render(
      <MediaViewer
        images={images}
        open
        currentId="a"
        onCurrentChange={change}
        onOpenChange={close}
        label="Preview"
      />
    );
    // jsdom has no CSS animation completion; real visibility is covered in Chromium.
    expect(
      await screen.findByRole('button', { name: 'View image 1 of 2', hidden: true })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Close viewer' }).querySelector('svg')
    ).not.toBeNull();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Close viewer' }), { key: 'ArrowRight' });
    expect(change).toHaveBeenCalledExactlyOnceWith('b');
    expect(screen.getByRole('img')).toHaveAttribute('src', '/a.png');
    fireEvent.click(screen.getByRole('button', { name: 'Close viewer' }));
    expect(close).toHaveBeenCalledExactlyOnceWith(false);
  });
  it('requests a dot selection while leaving the parent in control', async () => {
    const change = vi.fn();
    render(
      <MediaViewer
        images={images}
        open
        currentId="a"
        onCurrentChange={change}
        onOpenChange={vi.fn()}
        label="Preview"
      />
    );
    // jsdom has no CSS animation completion; real visibility is covered in Chromium.
    fireEvent.click(await screen.findByRole('button', { name: 'View image 2 of 2', hidden: true }));
    expect(change).toHaveBeenCalledExactlyOnceWith('b');
    expect(screen.getByRole('img')).toHaveAttribute('src', '/a.png');
  });
  it('keeps the departing image when the owner clears selection during closing', () => {
    const props = { images, onCurrentChange: vi.fn(), onOpenChange: vi.fn(), label: 'Preview' };
    const { rerender } = render(<MediaViewer {...props} open currentId="b" />);
    rerender(<MediaViewer {...props} open={false} currentId={null} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/b.png');
    rerender(<MediaViewer {...props} images={images.slice(0, 1)} open={false} currentId={null} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('does not mount an eager full-size image inside a closed viewer', () => {
    const props = {
      images,
      currentId: 'a',
      onCurrentChange: vi.fn(),
      onOpenChange: vi.fn(),
      label: 'Preview',
    };
    const { rerender } = render(<MediaViewer {...props} open={false} />);
    expect(document.querySelector('img')).toBeNull();
    rerender(<MediaViewer {...props} open />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/a.png');
  });
  it('never renders removed project images and closes visually for an empty dataset', () => {
    const props = {
      open: true,
      currentId: 'a',
      onCurrentChange: vi.fn(),
      onOpenChange: vi.fn(),
      label: 'Preview',
    };
    const { rerender } = render(<MediaViewer {...props} images={images} />);
    rerender(
      <MediaViewer
        {...props}
        images={[{ ...images[0], id: 'new', src: '/new.png', alt: 'New', width: 10, height: 20 }]}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', '/new.png');
    expect(screen.queryByRole('group', { name: 'Image selection' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next image' })).toBeNull();
    rerender(<MediaViewer {...props} images={[]} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
