import { useRef, type ReactElement } from 'react';
import { MediaFigure } from '../media/media-figure.js';
import { formatText } from '@frontend/text-catalog';
import { resolveGalleryText, type GalleryText } from '../media/media-text.schema.js';
import { useStripDrag } from './use-strip-drag.js';
import { mediaPresentationAttributes } from '../media/media-presentation.js';
import type { MediaPresentation } from '../media/media-presentation.schema.js';
import type { ImageAsset, MediaFit, MediaRatio } from '../media/image.schema.js';

interface GalleryItemsProps {
  readonly presentation?: MediaPresentation | undefined;
  readonly drag?: boolean;
  readonly carousel?: boolean;
  readonly text?: GalleryText;
  readonly images: readonly ImageAsset[];
  readonly currentId: string | null;
  readonly fit: MediaFit;
  readonly ratio: MediaRatio;
  readonly zoom: boolean;
  readonly onView: (id: string) => void;
}
export function GalleryItems({
  images,
  presentation,
  drag = false,
  carousel = false,
  text: overrides,
  currentId,
  fit,
  ratio,
  zoom,
  onView,
}: GalleryItemsProps): ReactElement {
  const track = useRef<HTMLUListElement>(null);
  const handlers = useStripDrag(drag, track);
  const componentText = resolveGalleryText(overrides);
  return (
    <ul className="ui-gallery-items" {...handlers}>
      {images.map((image) => {
        const figure = (
          <MediaFigure
            failureLabel={componentText.failure}
            image={image}
            fit={fit}
            ratio={ratio}
            presentation={zoom ? undefined : presentation}
          />
        );
        return (
          <li
            key={image.id}
            className="ui-gallery-item"
            data-current={image.id === currentId}
            aria-hidden={carousel && image.id !== currentId ? true : undefined}
            inert={carousel && image.id !== currentId}
          >
            {zoom ? (
              <a
                className="ui-media-zoom ui-media-presentation"
                {...mediaPresentationAttributes(presentation)}
                href={image.src}
                aria-label={formatText(componentText.viewImage, {
                  description: image.alt || image.caption || image.id,
                })}
                aria-haspopup="dialog"
                onClick={(event) => {
                  if (
                    event.defaultPrevented ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.altKey ||
                    event.shiftKey
                  )
                    return;
                  event.preventDefault();
                  onView(image.id);
                }}
              >
                {figure}
              </a>
            ) : (
              figure
            )}
          </li>
        );
      })}
    </ul>
  );
}
