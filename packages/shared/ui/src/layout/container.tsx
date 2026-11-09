import type { ComponentPropsWithRef, ReactElement } from 'react';
import { uiClassName, withoutStyle } from '../dom-props.js';
import type { ContainerWidth } from './layout-options.js';

type ContainerElement = 'div' | 'section' | 'article';
type ElementProps<Element extends ContainerElement> = Omit<
  ComponentPropsWithRef<Element>,
  'style'
> & {
  readonly width?: ContainerWidth;
  readonly style?: never;
};
export type ContainerProps =
  | (ElementProps<'div'> & { readonly as?: 'div' })
  | (ElementProps<'section'> & { readonly as: 'section' })
  | (ElementProps<'article'> & { readonly as: 'article' });

function containerAttributes<T extends ContainerProps>(props: T) {
  const { as, width = 'content', className, ...rest } = props;
  void as;
  return {
    ...withoutStyle(rest),
    className: uiClassName('ui-container', className),
    'data-width': width,
  };
}

export function Container(props: ContainerProps): ReactElement {
  // Narrow the finite element choices so each native ref keeps its correct type.
  if (props.as === 'article') return <article {...containerAttributes(props)} />;
  if (props.as === 'section') return <section {...containerAttributes(props)} />;
  return <div {...containerAttributes(props)} />;
}
