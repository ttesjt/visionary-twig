import type { ReactElement } from 'react';
import type { ProjectCover } from '../contracts.js';

export function ProjectCoverImage({
  cover,
  src,
  sourceUrl,
  sizes,
}: {
  readonly cover: ProjectCover;
  readonly src: string;
  readonly sourceUrl?: ((objectKey: string) => string | undefined) | undefined;
  readonly sizes?: string | undefined;
}): ReactElement {
  const { display, thumbnail } = cover.sources ?? {};
  const smallSrc = thumbnail && sourceUrl?.(thumbnail.objectKey);
  const srcSet =
    smallSrc &&
    thumbnail &&
    display &&
    thumbnail.width < display.width &&
    thumbnail.objectKey !== display.objectKey
      ? `${smallSrc} ${thumbnail.width}w, ${src} ${display.width}w`
      : undefined;
  return (
    <img
      className="ui-project-card-cover"
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={cover.alt}
      loading="lazy"
      width={display?.width}
      height={display?.height}
    />
  );
}
