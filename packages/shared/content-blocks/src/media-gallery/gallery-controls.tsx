import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { formatText } from '@frontend/text-catalog';
import type { GalleryText } from '../media/media-text.schema.js';
import { resolveGalleryText } from '../media/media-text.schema.js';
import type { MediaGalleryData } from './media-gallery.schema.js';
import { GalleryThumbnails } from './gallery-thumbnails.js';

interface ArrowProps {
  readonly index: number;
  readonly count: number;
  readonly loop: boolean;
  readonly text: GalleryText;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}
export function GalleryArrows({
  index,
  count,
  loop,
  text: overrides,
  onPrevious,
  onNext,
}: ArrowProps) {
  const componentText = resolveGalleryText(overrides);
  return (
    <div className="ui-gallery-arrows">
      <button
        type="button"
        className="ui-icon-button"
        aria-label={componentText.previous}
        title={componentText.previous}
        disabled={!loop && index === 0}
        onClick={onPrevious}
      >
        <ChevronLeft aria-hidden="true" />
      </button>
      <button
        type="button"
        className="ui-icon-button"
        aria-label={componentText.next}
        title={componentText.next}
        disabled={!loop && index === count - 1}
        onClick={onNext}
      >
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
  );
}
export function GalleryControls({
  images,
  index,
  navigation,
  pagination,
  loop,
  showCount,
  autoplay,
  paused,
  reducedMotion,
  text: overrides,
  onSelect,
  onPrevious,
  onNext,
  onTogglePlayback,
}: {
  readonly images: MediaGalleryData['images'];
  readonly index: number;
  readonly navigation: NonNullable<MediaGalleryData['navigation']>;
  readonly pagination: NonNullable<MediaGalleryData['pagination']>;
  readonly loop: boolean;
  readonly showCount: boolean;
  readonly autoplay: boolean;
  readonly paused: boolean;
  readonly reducedMotion: boolean;
  readonly text: GalleryText;
  readonly onSelect: (index: number) => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onTogglePlayback: () => void;
}) {
  const componentText = resolveGalleryText(overrides);
  const multiple = images.length > 1;
  return (
    <div className="ui-gallery-controls">
      {multiple && navigation === 'below' && (
        <GalleryArrows
          index={index}
          count={images.length}
          loop={loop}
          text={componentText}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      )}
      {multiple && pagination === 'dots' && (
        <div className="ui-gallery-dots" role="group" aria-label={componentText.choose}>
          {images.map((image, position) => (
            <button
              key={image.id}
              type="button"
              className="ui-gallery-dot ui-icon-button"
              aria-label={formatText(componentText.showImage, {
                current: position + 1,
                description: image.alt || image.caption || image.id,
              })}
              aria-pressed={position === index}
              onClick={() => onSelect(position)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      {multiple && pagination === 'thumbnails' && (
        <GalleryThumbnails
          images={images}
          currentId={images[index]?.id ?? null}
          text={componentText}
          onSelect={(id) => {
            const position = images.findIndex((image) => image.id === id);
            if (position >= 0) onSelect(position);
          }}
        />
      )}
      <span
        className={showCount && multiple ? 'ui-media-count' : 'ui-media-count ui-visually-hidden'}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={formatText(componentText.countLabel, {
          current: index + 1,
          total: images.length,
        })}
      >
        {formatText(componentText.count, { current: index + 1, total: images.length })}
      </span>
      {autoplay && multiple && (
        <button
          type="button"
          className="ui-gallery-playback ui-icon-button"
          disabled={reducedMotion}
          aria-label={paused ? componentText.resume : componentText.pause}
          title={paused ? componentText.resume : componentText.pause}
          aria-pressed={!paused}
          onClick={onTogglePlayback}
        >
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}
