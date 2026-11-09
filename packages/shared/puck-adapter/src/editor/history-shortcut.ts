export interface HistoryShortcutControls {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  undo(): void;
  redo(): void;
}
interface HistoryKeyEvent {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}
export function applyHistoryShortcut(
  event: HistoryKeyEvent,
  controls: HistoryShortcutControls
): void {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const undo = event.key.toLowerCase() === 'z' && !event.shiftKey;
  const redo =
    (event.key.toLowerCase() === 'z' && event.shiftKey) || event.key.toLowerCase() === 'y';
  if ((undo && controls.canUndo) || (redo && controls.canRedo)) {
    event.preventDefault();
    event.stopPropagation();
    if (undo) controls.undo();
    else controls.redo();
  }
}
