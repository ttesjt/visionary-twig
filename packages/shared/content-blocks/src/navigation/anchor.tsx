import type { ReactElement, ReactNode } from 'react';
import { contentClassName } from '../shared/component-props.js';
import { anchorNameSchema, type AnchorData } from './anchor.schema.js';

export type AnchorProps = AnchorData & {
  readonly children?: ReactNode;
  readonly className?: string;
};
/** Native fragments retain deep linking, history and keyboard focus without JavaScript. */
export function Anchor({ name, children, className }: AnchorProps): ReactElement {
  return (
    <div
      id={anchorNameSchema.parse(name)}
      tabIndex={-1}
      className={contentClassName('ui-anchor', className)}
    >
      {children}
    </div>
  );
}
