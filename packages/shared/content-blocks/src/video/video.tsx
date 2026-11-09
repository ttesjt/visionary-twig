import type { ReactElement } from 'react';
import { contentClassName, type ContentProps } from '../shared/component-props.js';
import { mediaPresentationAttributes } from '../media/media-presentation.js';
import { videoPropsSchema, type VideoData } from './video.schema.js';

export type VideoProps = VideoData & ContentProps;
export function Video({
  label,
  sources,
  width,
  height,
  poster,
  caption,
  tracks,
  presentation,
  id,
  className,
}: VideoProps): ReactElement {
  const video = videoPropsSchema.parse({
    label,
    sources,
    width,
    height,
    poster,
    caption,
    tracks,
    presentation,
  });
  return (
    <figure
      id={id}
      className={contentClassName('ui-video-figure ui-media-presentation', className)}
      {...mediaPresentationAttributes(video.presentation)}
    >
      <video
        className="ui-video"
        aria-label={video.label}
        controls
        playsInline
        preload="metadata"
        width={video.width}
        height={video.height}
        poster={video.poster}
      >
        {video.sources.map((source) => (
          <source key={source.src} src={source.src} type={source.type} />
        ))}
        {video.tracks?.map((track) => (
          <track key={`${track.srcLang}-${track.src}`} {...track} />
        ))}
        <p>
          Your browser cannot play this video. <a href={video.sources[0]?.src}>Download video</a>
        </p>
      </video>
      {video.caption && <figcaption className="ui-media-caption">{video.caption}</figcaption>}
    </figure>
  );
}
