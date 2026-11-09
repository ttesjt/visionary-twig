import type { ReactElement } from 'react';
import { uiClassName, withoutStyle } from '../dom-props.js';
import type { Align, Collapse, Justify } from './layout-options.js';
import { DEFAULT_SPACE, DEFAULT_COLLAPSE } from './layout-options.js';
import type { LayoutProps } from './layout-props.js';

export interface ColumnProps extends LayoutProps {
  readonly align?: Align;
}
export interface RowProps extends ColumnProps {
  readonly collapse?: Collapse;
  readonly justify?: Justify;
  readonly wrap?: 'nowrap' | 'wrap';
}
export function Column({
  className,
  space = DEFAULT_SPACE,
  align = 'stretch',
  ...props
}: ColumnProps): ReactElement {
  return (
    <div
      {...withoutStyle(props)}
      className={uiClassName('ui-column', className)}
      data-space={space}
      data-align={align}
    />
  );
}
export function Row({
  className,
  space = DEFAULT_SPACE,
  collapse = DEFAULT_COLLAPSE,
  align = 'center',
  justify = 'start',
  wrap = 'nowrap',
  ...props
}: RowProps): ReactElement {
  return (
    <div
      {...withoutStyle(props)}
      className={uiClassName('ui-row', className)}
      data-space={space}
      data-collapse={collapse}
      data-align={align}
      data-justify={justify}
      data-wrap={wrap}
    />
  );
}
