import type { ComponentPropsWithRef, ReactElement } from 'react';
import { uiClassName, withoutStyle } from './dom-props.js';

export interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'style'> {
  readonly pending?: boolean;
  readonly style?: never;
}
export function Button({
  className,
  disabled,
  pending = false,
  type = 'button',
  ...props
}: ButtonProps): ReactElement {
  return (
    <button
      {...withoutStyle(props)}
      type={type}
      className={uiClassName('ui-button', className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      data-pending={pending || undefined}
    />
  );
}
