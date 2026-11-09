import type { ReactElement, ReactNode } from 'react';
import { Heading } from '../heading/heading.js';
import { RichText } from '../rich-text/rich-text.js';
import { MediaFigure } from '../media/media-figure.js';
import { MediaGallery } from '../media-gallery/media-gallery.js';
import { contentClassName, type ContentProps } from '../shared/component-props.js';
import type { MediaTextData } from './media-text.schema.js';

/** The union tag belongs to this composition, not to either child component. */
function mediaProps<T extends MediaTextData['media']>({
  type: _type,
  ...props
}: T): Omit<T, 'type'> {
  return props;
}

export type MediaTextProps = MediaTextData & ContentProps & { readonly children?: ReactNode };
export function MediaText({
  media,
  heading,
  body,
  mediaPosition = 'start',
  proportion = 'balanced',
  mediaSize = 'full',
  children,
  id,
  className,
}: MediaTextProps): ReactElement {
  const picture = (
    <div className="ui-media-text-media">
      {media.type === 'image' ? (
        <MediaFigure {...mediaProps(media)} />
      ) : (
        <MediaGallery {...mediaProps(media)} />
      )}
    </div>
  );
  const text = (
    <div className="ui-media-text-body">
      {heading && <Heading {...heading} />}
      <RichText content={body} />
      {children}
    </div>
  );
  // DOM order follows the chosen reading order; CSS never visually reverses focus order.
  return (
    <div
      id={id}
      className={contentClassName('ui-media-text', className)}
      data-position={mediaPosition}
      data-proportion={proportion}
      data-media-size={mediaSize}
    >
      {mediaPosition === 'end' ? (
        <>
          {text}
          {picture}
        </>
      ) : (
        <>
          {picture}
          {text}
        </>
      )}
    </div>
  );
}
