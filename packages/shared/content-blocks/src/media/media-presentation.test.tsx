import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MediaFigure } from './media-figure.js';
import { MediaGallery } from '../media-gallery/media-gallery.js';
import { MediaText } from '../media-text/media-text.js';
import { Video } from '../video/video.js';
import { mediaPresentationSchema } from './media-presentation.schema.js';
import { mediaTextPropsSchema } from '../media-text/media-text.schema.js';

const image = { id: 'study', src: '/study.svg', alt: 'A study', width: 480, height: 800 };
const presentation = { width: 'compact', maxHeight: 'regular', align: 'end' } as const;

describe('media placement contracts', () => {
  it.each([
    { width: 300 },
    { width: '300px' },
    { maxHeight: 400 },
    { maxHeight: '100vh' },
    { align: 'stretch' },
    { style: {} },
    { className: 'custom' },
  ])('rejects arbitrary styling in a placement: %j', (value) => {
    expect(mediaPresentationSchema.safeParse(value).success).toBe(false);
  });
  it('keeps intrinsic dimensions separate from display bounds in SSR', () => {
    const html = renderToStaticMarkup(<MediaFigure image={image} presentation={presentation} />);
    expect(html).toContain('width="480" height="800"');
    expect(html).toContain('data-media-width="compact"');
    expect(html).toContain('data-media-height="regular"');
    expect(html).toContain('data-media-align="end"');
    expect(html).not.toContain('style=');
    const legacy = renderToStaticMarkup(<MediaFigure image={image} />);
    expect(legacy).not.toContain('data-media-width');
    expect(legacy).not.toContain('data-media-height');
    expect(legacy).not.toContain('data-media-align');
  });
  it('limits gallery viewports and individual items independently, including non-zoom items', () => {
    for (const zoom of [true, false]) {
      const html = renderToStaticMarkup(
        <MediaGallery
          label="Studies"
          images={[image]}
          layout="grid"
          zoom={zoom}
          presentation={{ width: 'wide', maxHeight: 'tall' }}
          itemPresentation={presentation}
        />
      );
      expect(html).toContain('data-media-width="wide"');
      expect(html).toContain('data-media-height="tall"');
      expect(html).toContain('data-media-width="compact"');
      expect(html).toContain('data-media-align="end"');
    }
  });
  it('shares nested image/gallery bounds with MediaText without new source dimensions', () => {
    const props = mediaTextPropsSchema.parse({
      media: { type: 'image', image, presentation },
      body: [],
    });
    const html = renderToStaticMarkup(<MediaText {...props} />);
    expect(html).toContain('data-media-width="compact"');
    expect(html).toContain('width="480" height="800"');
    expect(
      mediaTextPropsSchema.safeParse({
        media: {
          type: 'gallery',
          images: [image],
          label: 'Studies',
          itemPresentation: presentation,
        },
        body: [],
      }).success
    ).toBe(true);
  });
  it('uses the same placement for native video without changing media metadata or controls', () => {
    const html = renderToStaticMarkup(
      <Video
        label="A study"
        width={1280}
        height={720}
        sources={[{ src: '/study.webm', type: 'video/webm' }]}
        presentation={presentation}
      />
    );
    expect(html).toContain('data-media-height="regular"');
    expect(html).toContain('width="1280" height="720"');
    expect(html).toContain('controls=""');
    expect(html).not.toContain('style=');
  });
});
