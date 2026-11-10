import { DEFAULT_COLLAPSE, DEFAULT_SPACE } from '@frontend/ui/layout-options';
import {
  DEFAULT_HEADING_LEVEL,
  DEFAULT_MEDIA_FIT,
  DEFAULT_MEDIA_RATIO,
  DEFAULT_GALLERY_LAYOUT,
} from '@frontend/content-blocks/schema';
import type { RuntimeProps } from '../config/types.js';

const image = {
  id: 'image',
  src: '/placeholder.svg',
  alt: 'Describe this image',
  width: 1200,
  height: 800,
};
const body = [
  { type: 'paragraph', content: [{ type: 'text', text: 'Write your content.' }] },
] as const;
/** Valid starting values; hosts replace placeholder media with their own resources. */
export const editorDefaults: RuntimeProps = {
  Container: { width: 'content', as: 'div', content: [] },
  Row: {
    space: DEFAULT_SPACE,
    collapse: DEFAULT_COLLAPSE,
    align: 'center',
    justify: 'start',
    wrap: 'nowrap',
    content: [],
  },
  Column: { space: DEFAULT_SPACE, align: 'stretch', content: [] },
  Grid: { columns: 1, space: DEFAULT_SPACE, collapse: DEFAULT_COLLAPSE, content: [] },
  Hero: { title: 'Project title', headingLevel: 1, width: 'content' },
  Separator: {},
  Tabs: { label: 'Tabbed content', content: [] },
  TabPanel: { label: 'Panel title', content: [] },
  Heading: { text: 'Heading', level: DEFAULT_HEADING_LEVEL, appearance: 'title' },
  RichText: { content: body },
  ActionLinks: { actions: [] },
  ContentSection: { width: 'content', surface: 'plain', content: [] },
  MediaFigure: { image, fit: DEFAULT_MEDIA_FIT, ratio: DEFAULT_MEDIA_RATIO, zoom: false },
  MediaGallery: {
    images: [],
    label: 'Gallery',
    layout: DEFAULT_GALLERY_LAYOUT,
    fit: DEFAULT_MEDIA_FIT,
    ratio: DEFAULT_MEDIA_RATIO,
    thumbnails: false,
    zoom: true,
  },
  MediaText: {
    media: { type: 'image', image },
    body,
    mediaPosition: 'start',
    proportion: 'balanced',
    content: [],
  },
  Anchor: { name: 'section', content: [] },
  Reveal: { content: [] },
  ScrollBoundary: { content: [] },
  ContentNavigation: {
    label: 'In this page',
    progressLabel: 'Reading progress',
    items: [{ label: 'Section', href: '#section' }],
    content: [{ type: 'Anchor', props: { id: 'section-anchor', name: 'section', content: [] } }],
  },
  Video: {
    label: 'Video',
    sources: [{ src: '/video.webm', type: 'video/webm' }],
    width: 1200,
    height: 800,
  },
};
