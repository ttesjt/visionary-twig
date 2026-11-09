'use client';

import { useState, type ReactElement, type ReactNode } from 'react';
import type { ImageAsset } from './image.schema.js';
import type { ViewerText } from './media-text.schema.js';
import { MediaViewer } from '../media-viewer/media-viewer.js';

interface FigureZoomProps {
  readonly image: ImageAsset;
  readonly label: string;
  readonly text?: ViewerText;
  readonly children: ReactNode;
}
export function FigureZoom({
  image,
  label,
  children,
  text: componentText,
}: FigureZoomProps): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <a
        className="ui-media-zoom"
        href={image.src}
        aria-label={label}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </a>
      <MediaViewer
        {...(componentText ? { text: componentText } : {})}
        images={[image]}
        currentId={image.id}
        open={open}
        onOpenChange={setOpen}
        onCurrentChange={() => {}}
        label={label}
      />
    </>
  );
}
