import { formatText } from '@frontend/text-catalog';
import { resolveGalleryText, type GalleryText } from '../media/media-text.schema.js';
import { Button } from '@frontend/ui';
import type { ReactElement } from 'react';
import type { ImageAsset } from '../media/image.schema.js';

interface GalleryThumbnailsProps {
  readonly text?: GalleryText;
  readonly images: readonly ImageAsset[];
  readonly currentId: string | null;
  readonly onSelect: (id: string) => void;
}
export function GalleryThumbnails({
  images,
  text: overrides,
  currentId,
  onSelect,
}: GalleryThumbnailsProps): ReactElement {
  const componentText = resolveGalleryText(overrides);
  return (
    <ul className="ui-gallery-thumbnails" aria-label={componentText.choose}>
      {images.map((image, index) => (
        <li key={image.id}>
          <Button
            className="ui-gallery-thumbnail"
            aria-label={formatText(componentText.showImage, {
              current: index + 1,
              description: image.alt || image.caption || image.id,
            })}
            aria-pressed={image.id === currentId}
            onClick={() => onSelect(image.id)}
          >
            <img src={image.src} alt="" width={image.width} height={image.height} loading="lazy" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
