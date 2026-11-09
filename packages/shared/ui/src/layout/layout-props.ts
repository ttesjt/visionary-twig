import type { ComponentPropsWithRef } from 'react';
import type { Space } from './layout-options.js';

export interface LayoutProps extends Omit<ComponentPropsWithRef<'div'>, 'style'> {
  readonly style?: never;
  readonly space?: Space;
}
