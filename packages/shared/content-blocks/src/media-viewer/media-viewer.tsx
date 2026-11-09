'use client';

import { useMemo, useState, type ReactElement } from 'react';
import { PhotoSlider } from 'react-photo-view';
import { Dialog } from '@frontend/ui/dialog';
import { X } from 'lucide-react';
import { resolveViewerText, type ViewerText } from '../media/media-text.schema.js';
import { useReducedMotion } from '../media/use-reduced-motion.js';
import { resolveImageSelection, mediaDatasetKey } from '../media/media-state.js';
import { contentClassName, type ContentProps } from '../shared/component-props.js';
import { viewerImagesSchema, type ViewerImage } from './viewer-image.schema.js';
import { usePhotoAccessibility } from './slider-accessibility.js';
import { ViewerControls } from './viewer-controls.js';
import { PHOTO_VIEWER_ANIMATION_MS, PHOTO_VIEWER_REDUCED_ANIMATION_MS } from './viewer-options.js';

export interface MediaViewerProps extends ContentProps {
  readonly images: readonly ViewerImage[];
  readonly open: boolean;
  readonly currentId: string | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCurrentChange: (id: string) => void;
  readonly label: string;
  readonly closeLabel?: string;
  readonly copy?: ViewerText;
}
function PhotoSession({
  images,
  open,
  currentId,
  onOpenChange,
  onCurrentChange,
  label,
  closeLabel,
  copy: overrides,
  id,
  className,
  afterClose,
}: MediaViewerProps & { readonly afterClose: () => void }): ReactElement {
  const componentText = resolveViewerText(overrides);
  // Closing owners may clear currentId immediately; keep the departing photo for its exit animation.
  const [lastOpenId, setLastOpenId] = useState(currentId);
  if (open && lastOpenId !== currentId) setLastOpenId(currentId);
  const { image, index } = resolveImageSelection(images, open ? currentId : lastOpenId);
  const [surface, setSurface] = useState<HTMLDivElement | null>(null);
  const [retry, setRetry] = useState(0);
  const reducedMotion = useReducedMotion();
  // Original metadata remains private to the caller; this viewer consumes display URLs only.
  const photos = useMemo(
    () => images.map((asset) => ({ key: asset.id, src: asset.src })),
    [images]
  );
  usePhotoAccessibility(surface, images, index);
  return (
    <Dialog
      id={id}
      className={contentClassName('ui-media-viewer', className)}
      open
      onOpenChange={onOpenChange}
      title={label}
      closeLabel={closeLabel ?? componentText.close}
      closeIcon={<X aria-hidden="true" />}
      data-viewer-engine="react-photo-view"
      onKeyDownCapture={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onOpenChange(false);
        } else if (event.altKey || event.ctrlKey || event.metaKey) event.stopPropagation();
      }}
    >
      <div
        ref={setSurface}
        className="ui-content-photo-surface"
        role="region"
        aria-label={componentText.viewport}
      >
        {surface && (
          <PhotoSlider
            key={retry}
            images={photos}
            index={index}
            visible={open}
            portalContainer={surface}
            className="ui-content-photo-slider"
            bannerVisible={false}
            photoClosable={false}
            maskOpacity={null}
            loop={false}
            speed={() =>
              reducedMotion ? PHOTO_VIEWER_REDUCED_ANIMATION_MS : PHOTO_VIEWER_ANIMATION_MS
            }
            onClose={() => onOpenChange(false)}
            afterClose={afterClose}
            onIndexChange={(position) => {
              const next = images[position];
              if (next) onCurrentChange(next.id);
            }}
            loadingElement={
              <span className="ui-content-photo-loading" role="status">
                {componentText.loading}
              </span>
            }
            brokenElement={
              <div
                className="ui-content-photo-failure"
                role="alert"
                onMouseDown={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                onTouchEnd={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <p>{componentText.failure}</p>
                <button type="button" onClick={() => setRetry((value) => value + 1)}>
                  {componentText.retry}
                </button>
              </div>
            }
            overlayRender={(controls) => (
              <ViewerControls controls={controls} text={componentText} />
            )}
          />
        )}
      </div>
      {(image?.caption || image?.description) && (
        <div className="ui-content-photo-caption">
          {image.caption && <p>{image.caption}</p>}
          {image.description && <p>{image.description}</p>}
        </div>
      )}
    </Dialog>
  );
}
/** Presence belongs to a resource set, so replacing closing data cannot leave an empty modal. */
function PhotoPresence(props: MediaViewerProps): ReactElement | null {
  const [present, setPresent] = useState(props.open);
  if (props.open && !present) setPresent(true);
  if (!props.open && !present) return null;
  return <PhotoSession {...props} afterClose={() => setPresent(false)} />;
}
/** Thin controlled photo-engine integration; Art keeps its own domain-specific viewer. */
export function MediaViewer(props: MediaViewerProps): ReactElement | null {
  const images = viewerImagesSchema.parse(props.images);
  if (!images.length) return null;
  return <PhotoPresence {...props} images={images} key={mediaDatasetKey(images)} />;
}
