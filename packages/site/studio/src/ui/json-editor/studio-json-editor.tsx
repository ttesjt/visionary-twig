import { useId, useState } from 'react';
import { Dialog } from '@frontend/ui/dialog';
import { StudioIssues } from '../issues/studio-issues.js';
import { DEFAULT_STUDIO_JSON_TEXT, type StudioJsonTextCatalog } from './text-catalog.js';
import { JSON_SECTIONS } from './draft-model.js';
import type { StudioJsonDrafts } from './use-json-drafts.js';
export interface StudioJsonEditorProps {
  readonly drafts: StudioJsonDrafts;
  readonly text?: StudioJsonTextCatalog;
}
/** Source editor only: no files, preview transport, database or publication side effects. */
export function StudioJsonEditor({
  drafts,
  text: componentText = DEFAULT_STUDIO_JSON_TEXT,
}: StudioJsonEditorProps) {
  const section = drafts.section;
  const [resetting, setResetting] = useState(false);
  const id = useId();
  return (
    <section className="ui-studio-json-source" aria-label={componentText.title}>
      <div className="ui-studio-actions ui-studio-json-source-tools">
        <label className="ui-studio-field ui-studio-inline-field">
          {componentText.section}
          <select
            aria-label={componentText.section}
            value={section}
            onChange={(event) => {
              const selected = JSON_SECTIONS.find((value) => value === event.target.value);
              if (selected) drafts.select(selected);
            }}
          >
            {JSON_SECTIONS.map((value) => (
              <option key={value} value={value}>
                {componentText.sections[value]}
              </option>
            ))}
          </select>
        </label>
        <button className="ui-studio-button" type="button" onClick={() => drafts.format(section)}>
          {componentText.format}
        </button>
        <button className="ui-studio-button" type="button" onClick={() => drafts.validate()}>
          {componentText.validate}
        </button>
        <button
          className="ui-studio-button"
          type="button"
          disabled={!drafts.pending}
          onClick={() => drafts.apply()}
        >
          {componentText.apply}
        </button>
        <button
          className="ui-studio-button"
          type="button"
          disabled={!drafts.pending}
          onClick={() => setResetting(true)}
        >
          {componentText.reset}
        </button>
      </div>
      <label className="ui-studio-sr-only" htmlFor={id}>
        {componentText.sections[section]}
      </label>
      <textarea
        id={id}
        className="ui-studio-json-source-input"
        value={drafts.text(section)}
        spellCheck={false}
        wrap="off"
        onChange={(event) => drafts.change(section, event.target.value)}
      />
      <p role="status">
        {drafts.conflicted(section)
          ? componentText.conflict
          : drafts.pending
            ? componentText.draft
            : componentText.current}
      </p>
      <StudioIssues issues={drafts.issues} label={componentText.issues} />
      <Dialog
        open={resetting}
        onOpenChange={setResetting}
        title={componentText.resetTitle}
        description={componentText.resetDescription}
      >
        <div className="ui-studio-actions">
          <button className="ui-studio-button" type="button" onClick={() => setResetting(false)}>
            {componentText.cancel}
          </button>
          <button
            className="ui-studio-button"
            type="button"
            onClick={() => {
              drafts.reset(section);
              setResetting(false);
            }}
          >
            {componentText.reset}
          </button>
        </div>
      </Dialog>
    </section>
  );
}
