import { formatText } from '@frontend/text-catalog';
import { resolveViewerText, type ViewerText } from '../media/media-text.schema.js';
import { Button } from '@frontend/ui';
import type { ReactElement } from 'react';

export function ViewerNavigation({
  count,
  text: overrides,
  index,
  onSelect,
}: {
  readonly text?: ViewerText;
  readonly count: number;
  readonly index: number;
  readonly onSelect: (index: number) => void;
}): ReactElement | null {
  const componentText = resolveViewerText(overrides);
  if (count <= 1) return null;
  return (
    <div className="ui-viewer-navigation" role="group" aria-label={componentText.selection}>
      {Array.from({ length: count }, (_, position) => (
        <Button
          key={position}
          className="ui-viewer-dot ui-icon-button"
          aria-label={formatText(componentText.selectImage, {
            current: position + 1,
            total: count,
          })}
          aria-pressed={position === index}
          onClick={() => onSelect(position)}
        >
          <span className="ui-viewer-dot-mark" aria-hidden="true" />
        </Button>
      ))}
      <span className="ui-visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {formatText(componentText.count, { current: index + 1, total: count })}
      </span>
    </div>
  );
}
