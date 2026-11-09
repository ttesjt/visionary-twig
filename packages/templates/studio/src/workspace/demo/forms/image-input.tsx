'use client';
import { useId } from 'react';
import { formatText } from '@frontend/text-catalog';
import { useStudioText } from '../../../text/use-studio-text';
import { DEMO_IMAGE_URL_MAX_LENGTH } from '../demo-record';
import {
  DEMO_IMAGE_MODES,
  DEMO_IMAGE_TYPES,
  MAX_DEMO_IMAGE_MIB,
  validDemoImage,
  type DemoImageDraft,
} from '../publishing/draft';
export function ImageInput({
  image,
  onChange,
}: {
  readonly image: DemoImageDraft;
  readonly onChange: (image: DemoImageDraft) => void;
}) {
  const id = useId();
  const componentText = useStudioText().workspace.demo.upload;
  return (
    <div className="ui-studio-flow">
      <div className="ui-studio-field">
        <label htmlFor={id + '-mode'}>{componentText.imageMode}</label>
        <select
          id={id + '-mode'}
          value={image.mode}
          onChange={(event) => {
            const mode = event.target.value;
            if (mode === 'none') onChange({ mode });
            else if (mode === 'url') onChange({ mode, url: '' });
            else if (mode === 'file') onChange({ mode, file: null });
          }}
        >
          {DEMO_IMAGE_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {componentText.imageModes[mode]}
            </option>
          ))}
        </select>
      </div>
      {image.mode === 'url' && (
        <div className="ui-studio-field">
          <label htmlFor={id + '-url'}>{componentText.imageUrl}</label>
          <input
            id={id + '-url'}
            inputMode="url"
            required
            maxLength={DEMO_IMAGE_URL_MAX_LENGTH}
            value={image.url}
            onChange={(event) => onChange({ mode: 'url', url: event.target.value })}
          />
          <p className="ui-studio-muted">{componentText.urlHelp}</p>
        </div>
      )}
      {image.mode === 'file' && (
        <div className="ui-studio-field">
          <label htmlFor={id + '-file'}>{componentText.imageFile}</label>
          <input
            id={id + '-file'}
            type="file"
            accept={DEMO_IMAGE_TYPES.join(',')}
            onChange={(event) => {
              const file = event.target.files?.[0];
              onChange({ mode: 'file', file: file ?? null });
            }}
          />
          <p className="ui-studio-muted">
            {formatText(componentText.fileHelp, { maxMiB: MAX_DEMO_IMAGE_MIB })}
          </p>
          {image.file !== null && !validDemoImage(image.file) && (
            <p role="alert">{componentText.invalidImage}</p>
          )}
        </div>
      )}
    </div>
  );
}
