import type { ReactElement } from 'react';
import { uiClassName, withoutStyle } from '../dom-props.js';
import type { Collapse, GridColumns } from './layout-options.js';
import { DEFAULT_SPACE, DEFAULT_COLLAPSE } from './layout-options.js';
import type { LayoutProps } from './layout-props.js';

export interface GridProps extends LayoutProps {
  readonly columns?: GridColumns;
  readonly collapse?: Collapse;
}
export function Grid({
  columns = 1,
  collapse = DEFAULT_COLLAPSE,
  space = DEFAULT_SPACE,
  className,
  ...props
}: GridProps): ReactElement {
  return (
    <div
      {...withoutStyle(props)}
      className={uiClassName('ui-grid', className)}
      data-columns={columns}
      data-collapse={collapse}
      data-space={space}
    />
  );
}
