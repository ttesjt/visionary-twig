'use client';
import type { NavigationItemPartProps } from '../presentation/parts.js';
import { appearanceAttributes, resolveItemDesign } from './resolve.js';
import { NavigationMediaContent } from './media.js';
export function ConfigurableNavigationItem({
  item,
  index,
  current,
  placement,
  options,
  className,
}: NavigationItemPartProps & { readonly className?: string }) {
  const { representation, appearance } = resolveItemDesign(options, item.href, index, current);
  return (
    <span
      className={
        'ui-navigation-part-item ui-navigation-part-appearance' + (className ? ` ${className}` : '')
      }
      {...appearanceAttributes(appearance)}
      data-current={current}
      data-index={index}
      data-placement={placement}
      data-display={representation.display ?? 'text'}
      data-media-size={representation.mediaSize ?? 'small'}
      data-media-fit={representation.mediaFit ?? 'contain'}
      data-media-shape={representation.mediaShape ?? 'square'}
    >
      {representation.showIndex && (
        <span className="ui-navigation-part-index" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
      )}
      {representation.media && (representation.display ?? 'text') !== 'text' && (
        <span className="ui-navigation-part-media" aria-hidden="true">
          <NavigationMediaContent media={representation.media} />
        </span>
      )}
      <span className="ui-navigation-part-text">{item.label}</span>
    </span>
  );
}
