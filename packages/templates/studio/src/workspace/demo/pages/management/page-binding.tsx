'use client';
import { useState } from 'react';
import { Dialog } from '@frontend/ui/dialog';
import { useStudioText } from '../../../../text/use-studio-text';
import type { DemoRecord } from '../../demo-record';
export function PageBinding({
  records,
  boundItemId,
  itemId,
  onSelect,
  onUnlink,
  busy,
}: {
  readonly records: readonly DemoRecord[];
  readonly boundItemId: string | null;
  readonly itemId: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly onUnlink: () => void;
  readonly busy: boolean;
}) {
  const componentText = useStudioText().workspace.demo.pages.binding;
  const [choice, setChoice] = useState('');
  const [confirm, setConfirm] = useState(false);
  const chosen = records.find((record) => record.id === itemId);
  return (
    <section className="ui-studio-binding ui-studio-flow" aria-label={componentText.title}>
      <p role="status">
        {boundItemId !== null
          ? componentText.bound
          : itemId !== null
            ? componentText.pending
            : componentText.unbound}
      </p>
      {itemId !== null ? (
        <>
          <p>
            {chosen?.title ?? itemId} · {itemId}
          </p>
          <div>
            <button
              className="ui-studio-button"
              type="button"
              disabled={busy}
              onClick={() => (boundItemId !== null ? setConfirm(true) : onSelect(null))}
            >
              {boundItemId !== null ? componentText.unlink : componentText.clear}
            </button>
          </div>
        </>
      ) : (
        <div className="ui-studio-actions">
          <label className="ui-studio-field">
            {componentText.choose}
            <select
              value={choice}
              disabled={busy}
              onChange={(event) => setChoice(event.target.value)}
            >
              <option value="">{componentText.placeholder}</option>
              {records
                .filter((record) => !record.pageId)
                .map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.title}
                  </option>
                ))}
            </select>
          </label>
          <button
            className="ui-studio-button"
            type="button"
            disabled={busy || !records.some((record) => record.id === choice && !record.pageId)}
            onClick={() => {
              onSelect(choice);
              setChoice('');
            }}
          >
            {componentText.select}
          </button>
        </div>
      )}
      <details className="ui-studio-inline-help">
        <summary>{componentText.helpLabel}</summary>
        <p>{componentText.help}</p>
      </details>
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title={componentText.confirmTitle}
        description={componentText.confirmBody}
      >
        <div className="ui-studio-actions">
          <button type="button" className="ui-studio-button" onClick={() => setConfirm(false)}>
            {componentText.cancel}
          </button>
          <button
            type="button"
            className="ui-studio-button"
            disabled={busy}
            onClick={() => {
              setConfirm(false);
              onUnlink();
            }}
          >
            {componentText.confirm}
          </button>
        </div>
      </Dialog>
    </section>
  );
}
