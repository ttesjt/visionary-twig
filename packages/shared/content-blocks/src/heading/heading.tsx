import { createElement, type ReactElement } from 'react';
import { contentClassName, type ContentProps } from '../shared/component-props.js';
import { DEFAULT_HEADING_LEVEL, type HeadingData } from './heading.schema.js';

export const HEADING_ELEMENTS = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5', 6: 'h6' } as const;
export type HeadingProps = HeadingData & ContentProps;

export function Heading({
  text,
  level = DEFAULT_HEADING_LEVEL,
  appearance = 'title',
  align,
  id,
  className,
}: HeadingProps): ReactElement {
  return createElement(
    HEADING_ELEMENTS[level],
    {
      id,
      className: contentClassName('ui-heading', className),
      'data-appearance': appearance,
      'data-align': align,
    },
    text
  );
}
