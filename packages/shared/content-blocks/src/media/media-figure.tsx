import type { ReactElement } from 'react';
import { contentClassName, type ContentProps } from '../shared/component-props.js';
import {
  DEFAULT_MEDIA_FIT,
  DEFAULT_MEDIA_RATIO,
  imageAssetSchema,
  type MediaFigureData,
  type ImageAsset,
} from './image.schema.js';
import { mediaDatasetKey } from './media-state.js';
import { FigureZoom } from './figure-zoom.js';
import { mediaPresentationAttributes } from './media-presentation.js';
import { MediaImage } from './media-image.js';

export type MediaFigureProps = MediaFigureData &
  ContentProps & { readonly fallbackImage?: ImageAsset | undefined };
export function MediaFigure({
  image,
  fallbackImage,
  fit = DEFAULT_MEDIA_FIT,
  ratio = DEFAULT_MEDIA_RATIO,
  loading = 'lazy',
  failureLabel = 'Image unavailable',
  zoom = false,
  zoomLabel,
  viewerCopy,
  presentation,
  id,
  className,
}: MediaFigureProps): ReactElement {
  const asset = imageAssetSchema.parse(image);
  const fallback = fallbackImage ? imageAssetSchema.parse(fallbackImage) : undefined;
  return (
    <figure
      id={id}
      className={contentClassName('ui-media-figure ui-media-presentation', className)}
      {...mediaPresentationAttributes(presentation)}
    >
      {zoom ? (
        <FigureZoom
          key={mediaDatasetKey([asset])}
          {...(viewerCopy ? { copy: viewerCopy } : {})}
          image={asset}
          label={zoomLabel ?? `View image: ${asset.alt || asset.caption || asset.id}`}
        >
          <MediaImage
            image={asset}
            fallbackImage={fallback}
            fit={fit}
            ratio={ratio}
            loading={loading}
            failureLabel={failureLabel}
          />
        </FigureZoom>
      ) : (
        <MediaImage
          image={asset}
          fallbackImage={fallback}
          fit={fit}
          ratio={ratio}
          loading={loading}
          failureLabel={failureLabel}
        />
      )}
      {asset.caption && <figcaption className="ui-media-caption">{asset.caption}</figcaption>}
    </figure>
  );
}
