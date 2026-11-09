import type { ComponentProps } from 'react';
import { PhotoSlider } from 'react-photo-view';
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react';
import { resolveViewerText, type ViewerText } from '../media/media-text.schema.js';
import { ViewerNavigation } from './viewer-navigation.js';
import {
  PHOTO_VIEWER_MIN_SCALE,
  PHOTO_VIEWER_MAX_SCALE,
  PHOTO_VIEWER_SCALE_STEP,
} from './viewer-options.js';

type PhotoControls = Parameters<
  NonNullable<ComponentProps<typeof PhotoSlider>['overlayRender']>
>[0];
export function ViewerControls({
  controls,
  text: overrides,
}: {
  readonly controls: PhotoControls;
  readonly text: ViewerText;
}) {
  const componentText = resolveViewerText(overrides);
  return (
    <div
      className="ui-content-photo-controls"
      data-scale={controls.scale}
      aria-hidden={!controls.overlayVisible}
      inert={!controls.overlayVisible}
    >
      <div className="ui-viewer-tools" role="group" aria-label={componentText.controls}>
        <button
          type="button"
          className="ui-icon-button"
          aria-label={componentText.zoomOut}
          title={componentText.zoomOut}
          disabled={controls.scale <= PHOTO_VIEWER_MIN_SCALE}
          onClick={() =>
            controls.onScale(
              Math.max(PHOTO_VIEWER_MIN_SCALE, controls.scale - PHOTO_VIEWER_SCALE_STEP)
            )
          }
        >
          <Minus aria-hidden="true" />
        </button>
        <button
          type="button"
          className="ui-icon-button"
          aria-label={componentText.zoomIn}
          title={componentText.zoomIn}
          disabled={controls.scale >= PHOTO_VIEWER_MAX_SCALE}
          onClick={() =>
            controls.onScale(
              Math.min(PHOTO_VIEWER_MAX_SCALE, controls.scale + PHOTO_VIEWER_SCALE_STEP)
            )
          }
        >
          <Plus aria-hidden="true" />
        </button>
        <button
          type="button"
          className="ui-icon-button"
          aria-label={componentText.reset}
          title={componentText.reset}
          disabled={controls.scale === PHOTO_VIEWER_MIN_SCALE}
          onClick={() => controls.onScale(PHOTO_VIEWER_MIN_SCALE)}
        >
          <RotateCcw aria-hidden="true" />
        </button>
      </div>
      {controls.images.length > 1 && (
        <div className="ui-content-photo-arrows">
          <button
            type="button"
            className="ui-icon-button"
            aria-label={componentText.previous}
            title={componentText.previous}
            disabled={controls.index === 0}
            onClick={() => controls.onIndexChange(controls.index - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ui-icon-button"
            aria-label={componentText.next}
            title={componentText.next}
            disabled={controls.index === controls.images.length - 1}
            onClick={() => controls.onIndexChange(controls.index + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      )}
      <ViewerNavigation
        text={componentText}
        count={controls.images.length}
        index={controls.index}
        onSelect={controls.onIndexChange}
      />
    </div>
  );
}
