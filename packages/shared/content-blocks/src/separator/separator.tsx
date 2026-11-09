import type { ReactElement } from 'react';
import { contentClassName, type ContentProps } from '../shared/component-props.js';

export function Separator({ id, className }: ContentProps): ReactElement {
  return <hr id={id} className={contentClassName('ui-content-separator', className)} />;
}
