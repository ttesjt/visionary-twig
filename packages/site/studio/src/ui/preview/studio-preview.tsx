import { formatText } from '@frontend/text-catalog';
import { useStudioTextCatalog } from '../text/context.js';
import { useId, useState, type ReactNode } from 'react';
import { Button } from '@frontend/ui';
import type { ContentDocument } from '@frontend/ui-document';
import type { StudioPreviewAdapter } from './preview-contract.js';
import {
  DEFAULT_PREVIEW_VIEWPORT,
  PREVIEW_FRAME_HEIGHT,
  PREVIEW_VIEWPORTS,
} from './preview-options.js';
import type { StudioTheme } from './preview-options.js';
import { usePreview } from './use-preview.js';
import { StudioIssues } from '../issues/studio-issues.js';

export function StudioPreview({
  adapter,
  document,
  context,
  sessionKey,
  enabled,
  theme,
  automatic = false,
  empty = false,
  toolbarActions,
}: {
  readonly adapter: StudioPreviewAdapter | undefined;
  readonly document: ContentDocument;
  readonly context: unknown;
  readonly sessionKey: string | number;
  readonly enabled: boolean;
  readonly theme: StudioTheme;
  readonly automatic?: boolean;
  /** True only when the host has established there is no renderable working content. */
  readonly empty?: boolean;
  readonly toolbarActions?: ReactNode;
}) {
  const componentText = useStudioTextCatalog();
  const titleId = useId();
  const [width, setWidth] = useState<number>(DEFAULT_PREVIEW_VIEWPORT.width);
  const preview = usePreview(
    adapter,
    { document, context, theme },
    sessionKey,
    enabled && !empty,
    automatic
  );
  return (
    <section className="ui-studio-preview" aria-labelledby={titleId}>
      <div className="ui-studio-actions">
        <h2 id={titleId}>{componentText.previewTitle}</h2>
        <label>
          {componentText.viewport}
          <select
            aria-label={componentText.previewViewport}
            value={width}
            onChange={(event) => {
              const option = PREVIEW_VIEWPORTS.find(
                (item) => String(item.width) === event.target.value
              );
              if (option) setWidth(option.width);
            }}
          >
            {PREVIEW_VIEWPORTS.map((option) => (
              <option key={option.width} value={option.width}>
                {formatText(componentText.viewportOption, {
                  label: componentText[option.labelKey],
                  width: option.width,
                })}
              </option>
            ))}
          </select>
        </label>
        {toolbarActions}
        <Button
          disabled={!adapter || !enabled || empty}
          pending={preview.state.status === 'loading'}
          onClick={() => {
            void preview.request();
          }}
        >
          {componentText.refreshPreview}
        </Button>
      </div>
      <p role="status">
        {empty && enabled
          ? componentText.previewEmpty
          : !adapter
            ? componentText.previewUnconfigured
            : !enabled
              ? componentText.previewBlocked
              : preview.stale
                ? componentText.previewStale
                : preview.state.status === 'loading'
                  ? componentText.previewLoading
                  : preview.state.status === 'idle'
                    ? componentText.previewIdle
                    : preview.state.status === 'ready'
                      ? componentText.previewReady
                      : componentText.previewFailed}
      </p>
      {empty && enabled && (
        <p className="ui-studio-preview-empty">{componentText.previewEmptyHelp}</p>
      )}
      {!empty && preview.state.status === 'failed' && (
        <StudioIssues issues={preview.state.errors} label={componentText.previewIssues} />
      )}
      {!empty && preview.state.status === 'ready' && (
        <div className="ui-studio-preview-viewport">
          <iframe
            className="ui-studio-preview-frame"
            title={componentText.previewFrame}
            src={preview.state.url}
            width={width}
            height={PREVIEW_FRAME_HEIGHT}
          />
        </div>
      )}
    </section>
  );
}
