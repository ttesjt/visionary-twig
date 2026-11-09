import { Button } from '@frontend/ui';
import { useEffect, useRef } from 'react';
import { useEditorPuck } from './use-editor-puck.js';
import { useEditorRuntime } from './editor-context.js';
export interface EditorHistoryControls {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly undoLabel: string;
  readonly redoLabel: string;
  readonly blocksLabel: string;
  readonly fieldsLabel: string;
}
export function HostEditorHeader({
  controls,
  memory,
}: {
  readonly controls: EditorHistoryControls;
  readonly memory: { current: string | null };
}) {
  const dispatch = useEditorPuck((state) => state.dispatch);
  const selectedItem = useEditorPuck((state) => state.selectedItem);
  const getSelectorForId = useEditorPuck((state) => state.getSelectorForId);
  const leftVisible = useEditorPuck((state) => state.appState.ui.leftSideBarVisible);
  const rightVisible = useEditorPuck((state) => state.appState.ui.rightSideBarVisible);
  const { nodeIds } = useEditorRuntime();
  const remembered = useRef(memory.current);
  const restored = useRef(false);
  useEffect(() => {
    if (!restored.current && remembered.current) {
      const selector = getSelectorForId(remembered.current);
      if (!nodeIds.has(remembered.current)) {
        remembered.current = null;
        memory.current = null;
        restored.current = true;
      } else if (selector) {
        restored.current = true;
        dispatch({ type: 'setUi', ui: { itemSelector: selector } });
      }
      return;
    }
    restored.current = true;
    const props: unknown = selectedItem?.props;
    const id = props !== null && typeof props === 'object' && 'id' in props ? props.id : null;
    memory.current = typeof id === 'string' ? id : null;
  }, [selectedItem, getSelectorForId, dispatch, memory, nodeIds]);
  return (
    <div className="ui-studio-actions">
      <Button
        type="button"
        onClick={() => dispatch({ type: 'setUi', ui: { leftSideBarVisible: !leftVisible } })}
      >
        {controls.blocksLabel}
      </Button>
      <Button type="button" disabled={!controls.canUndo} onClick={controls.undo}>
        {controls.undoLabel}
      </Button>
      <Button type="button" disabled={!controls.canRedo} onClick={controls.redo}>
        {controls.redoLabel}
      </Button>
      <Button
        type="button"
        onClick={() => dispatch({ type: 'setUi', ui: { rightSideBarVisible: !rightVisible } })}
      >
        {controls.fieldsLabel}
      </Button>
    </div>
  );
}
