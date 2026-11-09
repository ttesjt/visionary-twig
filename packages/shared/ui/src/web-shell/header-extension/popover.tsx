'use client';

import { useContext, useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { HeaderExtensionSurfaceContext } from './surface-context.js';

export interface HeaderExtensionPopoverProps {
  readonly trigger: ReactNode;
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly width?: 'content' | 'trigger';
}

function closePopover(element: HTMLDivElement | null): void {
  if (element?.isConnected && typeof element.hidePopover === 'function') element.hidePopover();
}

/** A native top-layer surface keeps DOM context/ownership while escaping extension clipping. */
export function HeaderExtensionPopover({
  trigger,
  label,
  children,
  className,
  width = 'content',
}: HeaderExtensionPopoverProps) {
  const interactive = useContext(HeaderExtensionSurfaceContext);
  if (interactive === null)
    throw new Error('HeaderExtensionPopover must render inside a Header extension.');
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const element = panel.current;
    if (!interactive) closePopover(element);
    return () => closePopover(element);
  }, [interactive]);
  useEffect(() => {
    function dismissHiddenTrigger() {
      if (button.current?.getClientRects().length === 0) closePopover(panel.current);
    }
    window.addEventListener('resize', dismissHiddenTrigger);
    return () => window.removeEventListener('resize', dismissHiddenTrigger);
  }, []);
  return (
    <div className={'ui-header-extension-popover' + (className ? ' ' + className : '')}>
      <button
        ref={button}
        className="ui-header-extension-popover-trigger"
        type="button"
        popoverTarget={id}
        disabled={!interactive}
      >
        {trigger}
      </button>
      <div
        ref={panel}
        id={id}
        className="ui-header-extension-popover-panel"
        data-width={width}
        popover="auto"
        role="region"
        aria-label={label}
        onBeforeToggle={(event) => {
          if (event.newState === 'open' && !interactive) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('a[href]'))
            closePopover(panel.current);
        }}
      >
        {children}
      </div>
    </div>
  );
}
