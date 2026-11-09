import type { ReactElement, ReactNode } from 'react';
import { uiClassName, withoutStyle } from '../dom-props.js';
import type { LayerPosition } from './layout-options.js';
import type { LayoutProps } from './layout-props.js';

export interface LayerProps extends Omit<LayoutProps, 'space'> {
  readonly overlay?: ReactNode;
  readonly position?: LayerPosition;
}
export function Layer({
  children,
  overlay,
  position = 'top-end',
  className,
  ...props
}: LayerProps): ReactElement {
  return (
    <div {...withoutStyle(props)} className={uiClassName('ui-layer', className)}>
      <div className="ui-layer-content">{children}</div>
      {overlay != null && (
        <div className="ui-layer-overlay" data-position={position}>
          {overlay}
        </div>
      )}
    </div>
  );
}
