'use client';

import {
  useId,
  useImperativeHandle,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { Button } from '../button.js';
import { uiClassName, withoutStyle } from '../dom-props.js';
import { useModalDialog } from './use-modal-dialog.js';

export interface DialogProps extends Omit<
  ComponentPropsWithRef<'dialog'>,
  | 'style'
  | 'open'
  | 'onCancel'
  | 'onClose'
  | 'title'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'role'
  | 'tabIndex'
> {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: ReactNode;
  readonly closeLabel?: string;
  readonly closeIcon?: ReactNode;
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
  readonly style?: never;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  closeLabel = 'Close dialog',
  closeIcon,
  initialFocusRef,
  className,
  ref,
  ...props
}: DialogProps): ReactElement {
  if (typeof title !== 'string' || !title.trim())
    throw new Error('Dialog requires a non-empty title.');
  if (!closeLabel.trim()) throw new Error('Dialog requires a non-empty closeLabel.');
  const titleId = useId();
  const descriptionId = useId();
  const elementRef = useModalDialog(open, initialFocusRef);
  useImperativeHandle(ref, () => {
    if (!elementRef.current) throw new Error('Dialog ref is unavailable before mounting.');
    return elementRef.current;
  }, [elementRef]);
  return (
    <dialog
      {...withoutStyle(props)}
      ref={elementRef}
      className={uiClassName('ui-dialog', className)}
      aria-labelledby={titleId}
      aria-describedby={description != null ? descriptionId : undefined}
      onCancel={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onOpenChange(false);
      }}
      onClose={(event) => {
        event.stopPropagation();
        // Ignore delayed close events from prop changes or StrictMode cleanup.
        if (open && elementRef.current && !elementRef.current.open) onOpenChange(false);
      }}
    >
      <div className="ui-dialog-header">
        <h2 className="ui-dialog-title" id={titleId}>
          {title}
        </h2>
        <Button
          className={uiClassName('ui-dialog-close', closeIcon ? 'ui-icon-button' : undefined)}
          aria-label={closeLabel}
          title={closeIcon ? closeLabel : undefined}
          onClick={() => onOpenChange(false)}
        >
          {closeIcon || closeLabel}
        </Button>
      </div>
      {description != null && (
        <p className="ui-dialog-description" id={descriptionId}>
          {description}
        </p>
      )}
      <div className="ui-dialog-body">{children}</div>
    </dialog>
  );
}
