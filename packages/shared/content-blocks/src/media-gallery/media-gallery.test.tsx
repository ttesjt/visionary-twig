import '@testing-library/jest-dom/vitest';
import '../../test/native-dialog.js';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MediaGallery } from '../gallery.js';
import { MediaFigure } from '../media/media-figure.js';

const images = [
  { id: 'a', src: '/a.png', alt: 'A', width: 20, height: 10 },
  { id: 'b', src: '/b.png', alt: 'B', width: 20, height: 10 },
];
describe('gallery sessions', () => {
  it('renders all semantic slides and real image links before enhancement', () => {
    const html = renderToStaticMarkup(
      <MediaGallery images={images} label="Gallery" layout="carousel" />
    );
    expect(html).toContain('data-enhanced="false"');
    expect(html).toContain('href="/a.png"');
    expect(html).toContain('href="/b.png"');
    expect(html).toContain('alt="B"');
  });
  it('supports thumbnails and keyboard selection without automatic playback', () => {
    render(<MediaGallery images={images} label="Gallery" layout="carousel" thumbnails />);
    fireEvent.click(screen.getByRole('button', { name: 'Show image 2: B' }));
    expect(screen.getByRole('button', { name: 'Show image 2: B' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.keyDown(screen.getByRole('region', { name: 'Gallery' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('button', { name: 'Show image 1: A' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
  it('closes the viewer and resets selection when a dataset is replaced', () => {
    const { rerender } = render(<MediaGallery images={images} label="Gallery" />);
    fireEvent.click(screen.getByRole('link', { name: 'View image: B' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    rerender(
      <MediaGallery
        images={[{ id: 'c', src: '/c.png', alt: 'C', width: 10, height: 20 }]}
        label="Gallery"
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('link', { name: 'View image: B' })).toBeNull();
    rerender(<MediaGallery images={[]} label="Gallery" />);
    expect(screen.getByText('No images available')).toBeVisible();
  });
  it('opens a single figure viewer and replaces it when the resource changes', () => {
    const image = { id: 'a', src: '/a.png', alt: 'A', width: 20, height: 10 };
    const { rerender } = render(<MediaFigure image={image} zoom />);
    fireEvent.click(screen.getByRole('link', { name: 'View image: A' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    rerender(<MediaFigure image={{ ...image, src: '/changed.png' }} zoom />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
