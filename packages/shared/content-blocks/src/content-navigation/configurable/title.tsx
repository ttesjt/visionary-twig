'use client';
import type { NavigationPartProps } from '../presentation/parts.js';
import { configurableTitleSchema } from './schema.js';
import { appearanceAttributes } from './resolve.js';
import { NavigationMediaContent } from './media.js';
export function ConfigurableNavigationTitle({
  navigation,
  options,
  placement,
  className,
}: NavigationPartProps & { readonly className?: string }) {
  const data = configurableTitleSchema.parse(options);
  const title = navigation.title ?? navigation.label;
  return (
    <span
      className={
        'ui-navigation-part-title ui-navigation-part-appearance' +
        (className ? ` ${className}` : '')
      }
      {...appearanceAttributes(data.appearance ?? {})}
      data-display={data.display ?? 'text'}
      data-compact={data.compact ?? 'same'}
      data-placement={placement}
      data-media-size={data.mediaSize ?? 'medium'}
      data-media-fit={data.mediaFit ?? 'contain'}
      data-media-shape={data.mediaShape ?? 'square'}
      role="img"
      aria-label={title}
    >
      {data.media && ((data.display ?? 'text') !== 'text' || data.compact === 'media') && (
        <span className="ui-navigation-part-media" aria-hidden="true">
          <NavigationMediaContent media={data.media} />
        </span>
      )}
      <span className="ui-navigation-part-text" aria-hidden="true">
        {title}
      </span>
    </span>
  );
}
