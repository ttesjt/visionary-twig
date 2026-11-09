import '@testing-library/jest-dom/vitest';
import '../../test/native-dialog.js';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaGallery } from './media-gallery.js';
import { GALLERY_AUTOPLAY_INTERVAL_MS } from './use-autoplay.js';
import { galleryTextCatalogSchema, viewerTextSchema, tabsPropsSchema } from '../schema.js';
import { ActionLinks } from '../action-links/action-links.js';
const images = [
  { id: 'a', src: '/a.svg', alt: 'A', width: 100, height: 200 },
  { id: 'b', src: '/b.svg', alt: 'B', width: 100, height: 200 },
];
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe('gallery upgrades', () => {
  it('localizes carousel role descriptions without applying them to other layouts', () => {
    const { rerender } = render(<MediaGallery images={images} label="Gallery" layout="carousel" />);
    expect(screen.getByRole('region', { name: 'Gallery' })).toHaveAttribute(
      'aria-roledescription',
      'carousel'
    );
    for (const layout of ['carousel', 'grid', 'strip'] as const) {
      rerender(
        <MediaGallery
          images={images}
          label="Gallery"
          layout={layout}
          copy={{ carouselRoleDescription: '图片轮播' }}
        />
      );
      const gallery = screen.getByRole('region', { name: 'Gallery' });
      if (layout === 'carousel')
        expect(gallery).toHaveAttribute('aria-roledescription', '图片轮播');
      else expect(gallery).not.toHaveAttribute('aria-roledescription');
    }
    expect(galleryTextCatalogSchema.safeParse({ carouselRoleDescription: '   ' }).success).toBe(
      false
    );
  });
  it('wraps both buttons and keyboard navigation only when loop is declared', () => {
    render(<MediaGallery images={images} label="Gallery" layout="carousel" loop />);
    fireEvent.click(screen.getByRole('button', { name: 'Previous image' }));
    expect(screen.getByRole('status')).toHaveTextContent('2 / 2');
    fireEvent.keyDown(screen.getByRole('region', { name: 'Gallery' }), { key: 'ArrowRight' });
    expect(screen.getByRole('status')).toHaveTextContent('1 / 2');
    expect(screen.getByRole('button', { name: 'Previous image' })).not.toBeDisabled();
  });
  it('defaults to no autoplay and preserves legacy edge states', async () => {
    vi.useFakeTimers();
    render(<MediaGallery images={images} label="Gallery" layout="carousel" />);
    await act(() => vi.advanceTimersByTime(GALLERY_AUTOPLAY_INTERVAL_MS * 2));
    expect(screen.getByRole('status')).toHaveTextContent('1 / 2');
    expect(screen.queryByRole('button', { name: 'Pause slideshow' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Previous image' })).toBeDisabled();
  });
  it('advances opt-in playback, pauses on hover, and stops after manual selection', async () => {
    vi.useFakeTimers();
    render(<MediaGallery images={images} label="Gallery" layout="carousel" loop autoplay />);
    await act(() => vi.advanceTimersByTime(GALLERY_AUTOPLAY_INTERVAL_MS));
    expect(screen.getByRole('status')).toHaveTextContent('2 / 2');
    const gallery = screen.getByRole('region', { name: 'Gallery' });
    fireEvent.mouseEnter(gallery);
    await act(() => vi.advanceTimersByTime(GALLERY_AUTOPLAY_INTERVAL_MS));
    expect(screen.getByRole('status')).toHaveTextContent('2 / 2');
    fireEvent.mouseLeave(gallery);
    fireEvent.click(screen.getByRole('button', { name: 'Next image' }));
    expect(screen.getByRole('button', { name: 'Resume slideshow' })).toBeVisible();
    await act(() => vi.advanceTimersByTime(GALLERY_AUTOPLAY_INTERVAL_MS * 2));
    expect(screen.getByRole('status')).toHaveTextContent('1 / 2');
    fireEvent.focus(gallery);
    fireEvent.click(screen.getByRole('button', { name: 'Resume slideshow' }));
    await act(() => vi.advanceTimersByTime(GALLERY_AUTOPLAY_INTERVAL_MS));
    expect(screen.getByRole('status')).toHaveTextContent('2 / 2');
  });
  it('respects reduced motion', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
    render(<MediaGallery images={images} label="Gallery" layout="carousel" loop autoplay />);
    await act(() => vi.advanceTimersByTime(GALLERY_AUTOPLAY_INTERVAL_MS * 2));
    expect(screen.getByRole('status')).toHaveTextContent('1 / 2');
    expect(screen.getByRole('button', { name: 'Pause slideshow' })).toBeDisabled();
  });
  it('never schedules playback for a single image', async () => {
    vi.useFakeTimers();
    render(
      <MediaGallery images={images.slice(0, 1)} label="Single" layout="carousel" loop autoplay />
    );
    await act(() => vi.advanceTimersByTime(GALLERY_AUTOPLAY_INTERVAL_MS * 2));
    expect(screen.getByRole('status')).toHaveTextContent('1 / 1');
    expect(screen.queryByRole('button', { name: 'Pause slideshow' })).toBeNull();
  });
  it('stops offscreen and in hidden tabs, then releases its timer on unmount', async () => {
    vi.useFakeTimers();
    let notify: ((entries: readonly { readonly isIntersecting: boolean }[]) => void) | undefined;
    class Observer {
      constructor(
        private readonly callback: (
          entries: readonly { readonly isIntersecting: boolean }[]
        ) => void
      ) {}
      observe(target: Element) {
        if (target.tagName === 'SECTION') notify = this.callback;
        this.callback([{ isIntersecting: false }]);
      }
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', Observer);
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const { unmount } = render(
      <MediaGallery images={images} label="Gallery" layout="carousel" loop autoplay />
    );
    await act(() => vi.advanceTimersByTime(GALLERY_AUTOPLAY_INTERVAL_MS));
    expect(screen.getByRole('status')).toHaveTextContent('1 / 2');
    act(() => notify?.([{ isIntersecting: true }]));
    await act(() => vi.advanceTimersByTime(GALLERY_AUTOPLAY_INTERVAL_MS));
    expect(screen.getByRole('status')).toHaveTextContent('2 / 2');
    visibility.mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    await act(() => vi.advanceTimersByTime(GALLERY_AUTOPLAY_INTERVAL_MS));
    expect(screen.getByRole('status')).toHaveTextContent('2 / 2');
    visibility.mockReturnValue('visible');
    fireEvent(document, new Event('visibilitychange'));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('accepts translated controls/viewer labels while hiding only visual helper copy', async () => {
    render(
      <MediaGallery
        images={images}
        label="图库"
        layout="carousel"
        showCount={false}
        copy={{
          previous: '上一张',
          next: '下一张',
          viewImage: '查看：{description}',
          viewerLabel: '{label}查看器',
        }}
        viewerCopy={{ close: '关闭', controls: '缩放工具', zoomIn: '放大', viewport: '图片区域' }}
      />
    );
    expect(screen.getByRole('button', { name: '上一张' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveClass('ui-visually-hidden');
    fireEvent.click(screen.getByRole('link', { name: '查看：A' }));
    expect(screen.getByRole('dialog', { name: '图库查看器' })).toBeVisible();
    expect(screen.getByRole('button', { name: '关闭' })).toBeVisible();
    expect(await screen.findByRole('button', { name: '放大', hidden: true })).toBeVisible();
  });
  it('keeps screenshots intrinsic and lets a host omit the strip hint', () => {
    const { container } = render(
      <MediaGallery
        images={images}
        label="Screenshots"
        layout="strip"
        stripSize="regular"
        drag
        showHint={false}
      />
    );
    expect(container.querySelector('.ui-media-gallery')).toHaveAttribute(
      'data-strip-size',
      'regular'
    );
    expect(container.querySelector('.ui-gallery-hint')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('height', '200');
  });
  it('rejects typoed interpolation variables and invalid tab props before rendering', () => {
    expect(galleryTextCatalogSchema.safeParse({ stripHint: '{totals} images' }).success).toBe(
      false
    );
    expect(viewerTextSchema.safeParse({ selectImage: '{current} / {count}' }).success).toBe(false);
    expect(tabsPropsSchema.safeParse({ label: '', style: {} }).success).toBe(false);
  });
  it('preserves new-tab semantics with an accessible-only translated hint', () => {
    render(
      <ActionLinks
        newTabHint="在新窗口打开"
        newTabHintDisplay="accessible"
        actions={[
          {
            id: 'download',
            label: '下载',
            availability: 'available',
            href: '/app.apk',
            newTab: true,
          },
        ]}
      />
    );
    const link = screen.getByRole('link', { name: /下载/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('在新窗口打开')).toHaveClass('ui-visually-hidden');
  });
});
