import { useEffect, useRef, type RefObject } from 'react';

export function useModalDialog(
  open: boolean,
  initialFocusRef?: RefObject<HTMLElement | null>
): RefObject<HTMLDialogElement | null> {
  const elementRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = elementRef.current;
    if (!dialog || !open) return;
    const previousFocus = dialog.ownerDocument.activeElement;
    dialog.showModal();
    const initialFocus = initialFocusRef?.current;
    if (initialFocus && dialog.contains(initialFocus)) initialFocus.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [open, initialFocusRef]);
  return elementRef;
}
