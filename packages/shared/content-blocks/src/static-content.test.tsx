import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  Hero,
  Heading,
  RichText,
  ActionLinks,
  ContentSection,
  MediaFigure,
  MediaText,
  Video,
} from './index.js';

const image = {
  id: 'diagram',
  src: '/diagram.svg',
  alt: 'Architecture diagram',
  width: 1200,
  height: 800,
  caption: 'Complete diagram',
};
describe('semantic content rendering', () => {
  it('renders contextual headings, text and slots into server HTML', () => {
    const html = renderToStaticMarkup(
      <Hero title="Project" headingLevel={2} summary="Chinese 中文 and English" image={image} />
    );
    expect(html).toContain('<h2');
    expect(html).not.toContain('<h1');
    expect(html).toContain('width="1200" height="800"');
    expect(html).toContain('Chinese 中文 and English');
    const { container } = render(
      <ContentSection
        heading={{ text: 'Section' }}
        body={[{ type: 'paragraph', content: [{ type: 'text', text: 'Body' }] }]}
        outro={[{ type: 'paragraph', content: [{ type: 'text', text: 'End' }] }]}
      >
        <p>Slot content</p>
      </ContentSection>
    );
    expect(container.textContent).toBe('SectionBodySlot contentEnd');
  });
  it('escapes text and renders valid structured lists and emphasis', () => {
    render(
      <RichText
        content={[
          { type: 'heading', level: 3, content: [{ type: 'text', text: '<script>text</script>' }] },
          {
            type: 'list',
            ordered: true,
            items: [
              {
                content: [
                  { type: 'strong', text: 'Strong' },
                  { type: 'emphasis', text: 'Emphasis' },
                  { type: 'code', text: 'Code' },
                  { type: 'link', href: '/docs', label: 'Docs' },
                ],
              },
            ],
          },
        ]}
      />
    );
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('<script>text</script>');
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByRole('list')).toHaveProperty('tagName', 'OL');
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs');
    expect(document.querySelector('strong')).toHaveTextContent('Strong');
  });
  it('renders real anchors and readable unavailable reasons without fake links', () => {
    render(
      <ActionLinks
        actions={[
          {
            id: 'web',
            label: 'Website',
            availability: 'available',
            href: 'https://example.test',
            newTab: true,
          },
          { id: 'ios', label: 'iOS', availability: 'unavailable', reason: 'Not released' },
        ]}
      />
    );
    expect(screen.getByRole('link', { name: /Website/ })).toHaveAttribute(
      'rel',
      'noopener noreferrer'
    );
    expect(screen.getByText('iOS')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('iOS')).toHaveAccessibleDescription('Not released');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
  it('preserves failed image geometry and resets failure when its URL changes', () => {
    const { rerender } = render(<MediaFigure image={image} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('status')).toHaveTextContent('Image unavailable: Architecture diagram');
    expect(screen.getByRole('img')).toHaveAttribute('width', '1200');
    rerender(<MediaFigure image={{ ...image, src: '/replacement.svg' }} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Complete diagram').tagName).toBe('FIGCAPTION');
  });
  it('falls back once to the display image, preserving its dimensions and final failure state', () => {
    render(
      <MediaFigure
        image={{ ...image, src: '/preview.png', width: 300, height: 200 }}
        fallbackImage={{ ...image, src: '/display.png' }}
      />
    );
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('img')).toHaveAttribute('src', '/display.png');
    expect(screen.getByRole('img')).toHaveAttribute('width', '1200');
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('status')).toHaveTextContent('Image unavailable');
  });
  it('uses native video controls, poster and captions without embeds or autoplay', () => {
    const { container } = render(
      <Video
        label="Walkthrough"
        width={800}
        height={450}
        poster="/poster.png"
        sources={[{ src: '/movie.webm', type: 'video/webm' }]}
        tracks={[
          {
            src: '/captions.vtt',
            srcLang: 'en',
            label: 'English',
            kind: 'captions',
            default: true,
          },
        ]}
      />
    );
    const video = container.querySelector('video');
    expect(video).toHaveAttribute('controls');
    expect(video).not.toHaveAttribute('autoplay');
    expect(container.querySelector('track')).toHaveAttribute('srclang', 'en');
    expect(container.querySelector('iframe')).toBeNull();
  });
  it('keeps MediaText DOM order aligned with the chosen reading order', () => {
    const body = [{ type: 'paragraph', content: [{ type: 'text', text: 'Description' }] }] as const;
    const { container, rerender } = render(
      <MediaText media={{ type: 'image', image }} body={body} mediaPosition="end" />
    );
    expect(container.querySelector('.ui-media-text')?.firstElementChild).toHaveClass(
      'ui-media-text-body'
    );
    rerender(<MediaText media={{ type: 'image', image }} body={body} mediaPosition="start" />);
    expect(container.querySelector('.ui-media-text')?.firstElementChild).toHaveClass(
      'ui-media-text-media'
    );
  });
  it('renders an embedded gallery without passing its union tag into the strict child schema', () => {
    render(
      <MediaText
        media={{
          type: 'gallery',
          images: [image],
          label: 'Embedded gallery',
          layout: 'carousel',
          loop: true,
        }}
        body={[]}
      />
    );
    expect(screen.getByRole('region', { name: 'Embedded gallery' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Architecture diagram' })).toBeVisible();
  });
  it('never forwards runtime authored styles to DOM elements', () => {
    const injected: Record<string, unknown> = { style: { width: '99999px' } };
    const { container } = render(
      <>
        <Heading {...injected} text="Heading" />
        <Hero {...injected} title="Hero" headingLevel={1} />
        <ContentSection {...injected} />
        <MediaFigure {...injected} image={image} />
        <RichText {...injected} content={[]} />
        <ActionLinks {...injected} actions={[]} />
      </>
    );
    expect(container.querySelector('[style]')).toBeNull();
  });
});

it('keeps Hero width semantic and independent of its background surface', () => {
  for (const width of ['reading', 'content', 'full'] as const) {
    const { container, unmount } = render(
      <Hero title="A story" headingLevel={1} width={width} variant="background" image={image} />
    );
    const section = container.querySelector('.ui-content-hero');
    expect(section).toHaveAttribute('data-variant', 'background');
    expect(section?.querySelector('.ui-content-inner')).toHaveAttribute('data-width', width);
    expect(section?.querySelector('.ui-hero-background')).toBeInTheDocument();
    unmount();
  }
  const { container } = render(<Hero title="Legacy document" headingLevel={1} />);
  expect(container.querySelector('.ui-content-inner')).toHaveAttribute('data-width', 'content');
});

it('keeps legacy Hero defaults while exposing explicit vertical layout hooks', () => {
  const { container, rerender } = render(
    <Hero title="A cover" headingLevel={1} variant="background" />
  );
  const hero = container.querySelector('.ui-content-hero');
  expect(hero).toHaveAttribute('data-size', 'comfortable');
  expect(hero).toHaveAttribute('data-content-position', 'center');
  expect(hero).toHaveAttribute('data-space-before', 'section');
  expect(hero).toHaveAttribute('data-space-after', 'section');
  rerender(
    <Hero
      title="A cover"
      headingLevel={1}
      variant="background"
      contentPosition="end"
      spaceBefore="none"
      spaceAfter="content"
      contentGap="section"
    />
  );
  expect(hero).toHaveAttribute('data-content-position', 'end');
  expect(hero).toHaveAttribute('data-space-before', 'none');
  expect(hero).toHaveAttribute('data-space-after', 'content');
  expect(container.querySelector('.ui-hero-content')).toHaveAttribute('data-space', 'section');
  expect(container.querySelector('[style]')).toBeNull();
});
