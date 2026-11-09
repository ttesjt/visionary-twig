'use client';

import { useCallback, useState, type ReactElement } from 'react';
import type { ImageAsset, MediaFit, MediaRatio } from './image.schema.js';

export interface MediaImageProps {
  readonly image: ImageAsset;
  readonly fallbackImage?: ImageAsset | undefined;
  readonly fit: MediaFit;
  readonly ratio: MediaRatio;
  readonly loading?: 'eager' | 'lazy';
  readonly failureLabel?: string;
}
function ImageWithStatus({
  image,
  fallbackImage,
  fit,
  ratio,
  loading = 'lazy',
  failureLabel = 'Image unavailable',
}: MediaImageProps): ReactElement {
  const [failed, setFailed] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const resource = usingFallback && fallbackImage ? fallbackImage : image;
  const fail = useCallback(() => {
    if (fallbackImage && !usingFallback && fallbackImage.src !== image.src) setUsingFallback(true);
    else setFailed(true);
  }, [fallbackImage, usingFallback, image.src]);
  const imageRef = useCallback(
    (element: HTMLImageElement | null) => {
      // A cached failure can occur before hydration attaches onError.
      if (element?.complete && element.naturalWidth === 0) fail();
    },
    [fail]
  );
  return (
    <span
      className="ui-media-frame"
      data-fit={fit}
      data-ratio={ratio}
      data-failed={failed || undefined}
    >
      <img
        ref={imageRef}
        className="ui-media-image"
        src={resource.src}
        alt={resource.alt}
        width={resource.width}
        height={resource.height}
        loading={loading}
        decoding="async"
        onError={fail}
      />
      {failed && (
        <span className="ui-media-failure" role="status">
          {failureLabel}
          {image.alt && `: ${image.alt}`}
        </span>
      )}
    </span>
  );
}
export function MediaImage(props: MediaImageProps): ReactElement {
  // Replacing a failed resource starts fresh; no effect races or stale error state.
  return (
    <ImageWithStatus key={JSON.stringify([props.image.src, props.fallbackImage?.src])} {...props} />
  );
}
