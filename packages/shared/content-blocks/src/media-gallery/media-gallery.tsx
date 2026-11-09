'use client';

import { useCallback, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import { formatText } from '@frontend/text-catalog';
import { DEFAULT_MEDIA_FIT, DEFAULT_MEDIA_RATIO } from '../media/image.schema.js';
import { resolveGalleryText } from '../media/media-text.schema.js';
import { MediaViewer } from '../media-viewer/media-viewer.js';
import { adjacentImageId, mediaDatasetKey, resolveImageSelection } from '../media/media-state.js';
import { contentClassName, type ContentProps } from '../shared/component-props.js';
import {
  DEFAULT_GALLERY_LAYOUT,
  mediaGalleryPropsSchema,
  type MediaGalleryData,
} from './media-gallery.schema.js';
import { GalleryItems } from './gallery-items.js';
import { GalleryArrows, GalleryControls } from './gallery-controls.js';
import { useEnhancement } from './use-enhancement.js';
import { useAutoplay } from './use-autoplay.js';
import { mediaPresentationAttributes } from '../media/media-presentation.js';
import { useCarousel } from './use-carousel.js';

export type MediaGalleryProps = MediaGalleryData & ContentProps;
function GallerySession({
  images,
  label,
  layout = DEFAULT_GALLERY_LAYOUT,
  fit = DEFAULT_MEDIA_FIT,
  ratio = DEFAULT_MEDIA_RATIO,
  thumbnails = false,
  zoom = true,
  emptyLabel,
  loop = false,
  autoplay = false,
  stripSize = 'content',
  drag = false,
  showCount = true,
  showHint = true,
  copy: overrides,
  viewerCopy,
  navigation = 'overlay',
  pagination = thumbnails ? 'thumbnails' : 'dots',
  transition = 'slide',
  presentation,
  itemPresentation,
  id,
  className,
}: MediaGalleryProps): ReactElement {
  const componentText = resolveGalleryText(overrides);
  const root = useRef<HTMLElement>(null);
  const [currentId, setCurrentId] = useState<string | null>(images[0]?.id ?? null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const enhanced = useEnhancement();
  const carousel = layout === 'carousel';
  const { image, index } = resolveImageSelection(images, currentId);
  const fromEngine = useCallback(
    (position: number) => {
      const next = images[position];
      if (next) setCurrentId(next.id);
    },
    [images]
  );
  const { viewportRef, api, reducedMotion } = useCarousel({
    enabled: carousel,
    loop,
    transition,
    onSelect: fromEngine,
  });
  const select = useCallback(
    (position: number) => {
      const next = images[position];
      if (!next) return;
      setCurrentId(next.id);
      api?.scrollTo(position);
    },
    [images, api]
  );
  const advance = useCallback(() => {
    const nextId = adjacentImageId(images, currentId, 1, loop);
    if (nextId) select(images.findIndex((candidate) => candidate.id === nextId));
  }, [images, currentId, loop, select]);
  const playback = useAutoplay({
    enabled: autoplay && carousel,
    canAdvance: images.length > 1 && (loop || index < images.length - 1),
    blocked: hovered || focused || viewingId !== null,
    onAdvance: advance,
    root,
  });
  const choose = (position: number) => {
    playback.setPaused(true);
    select(position);
  };
  const change = (offset: -1 | 1) => {
    const nextId = adjacentImageId(images, currentId, offset, loop);
    if (nextId) choose(images.findIndex((candidate) => candidate.id === nextId));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (
      !carousel ||
      event.target !== event.currentTarget ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      change(event.key === 'ArrowLeft' ? -1 : 1);
    }
  };
  const items = (
    <GalleryItems
      images={images}
      presentation={itemPresentation}
      currentId={image?.id ?? null}
      fit={fit}
      ratio={ratio}
      zoom={zoom}
      drag={drag && layout === 'strip'}
      carousel={carousel && enhanced}
      text={componentText}
      onView={(value) => {
        playback.setPaused(true);
        setViewingId(value);
      }}
    />
  );
  return (
    <section
      ref={root}
      id={id}
      className={contentClassName('ui-media-gallery ui-media-presentation', className)}
      {...mediaPresentationAttributes(presentation)}
      aria-label={label}
      aria-roledescription={carousel ? componentText.carouselRoleDescription : undefined}
      data-layout={layout}
      data-strip-size={stripSize}
      data-drag={drag}
      data-enhanced={enhanced}
      data-carousel-engine={carousel ? 'embla' : undefined}
      data-transition={transition}
      data-motion={reducedMotion ? 'reduced' : 'normal'}
      tabIndex={images.length > 1 ? 0 : undefined}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onPointerDown={() => {
        if (carousel) playback.setPaused(true);
      }}
    >
      {!images.length ? (
        <p className="ui-gallery-empty">{emptyLabel ?? componentText.empty}</p>
      ) : (
        <>
          {carousel ? (
            <div className="ui-gallery-carousel" data-navigation={navigation}>
              <div className="ui-gallery-carousel-surface">
                <div className="ui-gallery-viewport" ref={viewportRef}>
                  {items}
                </div>
                {enhanced && images.length > 1 && navigation === 'overlay' && (
                  <GalleryArrows
                    index={index}
                    count={images.length}
                    loop={loop}
                    text={componentText}
                    onPrevious={() => change(-1)}
                    onNext={() => change(1)}
                  />
                )}
              </div>
              {enhanced && (
                <GalleryControls
                  images={images}
                  index={index}
                  navigation={navigation}
                  pagination={pagination}
                  loop={loop}
                  showCount={showCount}
                  autoplay={autoplay}
                  paused={playback.paused}
                  reducedMotion={playback.reducedMotion}
                  text={componentText}
                  onSelect={choose}
                  onPrevious={() => change(-1)}
                  onNext={() => change(1)}
                  onTogglePlayback={() => {
                    if (playback.paused) {
                      if (!loop && index === images.length - 1) select(0);
                      setFocused(false);
                      setHovered(false);
                    }
                    playback.setPaused(!playback.paused);
                  }}
                />
              )}
            </div>
          ) : (
            items
          )}
          {layout === 'strip' && showHint && (
            <p className="ui-gallery-hint">
              {formatText(componentText.stripHint, { total: images.length })}
            </p>
          )}
          {zoom && (
            <MediaViewer
              images={images}
              currentId={viewingId}
              open={viewingId !== null}
              onOpenChange={(open) => {
                if (!open) setViewingId(null);
              }}
              onCurrentChange={setViewingId}
              label={formatText(componentText.viewerLabel, { label })}
              {...(viewerCopy ? { copy: viewerCopy } : {})}
            />
          )}
        </>
      )}
    </section>
  );
}
export function MediaGallery({ id, className, ...data }: MediaGalleryProps): ReactElement {
  const props = mediaGalleryPropsSchema.parse(data);
  return (
    <GallerySession
      key={mediaDatasetKey(props.images)}
      {...props}
      {...(id === undefined ? {} : { id })}
      {...(className === undefined ? {} : { className })}
    />
  );
}
