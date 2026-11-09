import {
  Anchor,
  ContentNavigation,
  ScrollBoundary,
  Reveal,
  Hero,
  Tabs,
  TabPanel,
  Separator,
  Heading,
  RichText,
  ActionLinks,
  ContentSection,
  MediaFigure,
  MediaText,
  Video,
} from '@frontend/content-blocks';
import { MediaGallery } from '@frontend/content-blocks/gallery';
import { layoutRenderers } from './layout-renderers.js';
import type { ComponentRenderers } from './types.js';

// Strip Puck bookkeeping at this boundary. Node IDs identify content bindings;
// they do not implicitly become duplicate DOM IDs in comparison/embedded renders.
export const componentRenderers: ComponentRenderers = {
  ...layoutRenderers,
  ContentNavigation: ({ content: Content, id, puck: _puck, editMode: _editMode, ...props }) => (
    <ContentNavigation {...props} resourceKey={id}>
      <Content />
    </ContentNavigation>
  ),
  ScrollBoundary: ({ content: Content, id: _id, puck: _puck, editMode: _editMode, ...props }) => (
    <ScrollBoundary {...props}>
      <Content />
    </ScrollBoundary>
  ),
  Anchor: ({ content: Content, id: _id, puck: _puck, editMode: _editMode, ...props }) => (
    <Anchor {...props}>
      <Content />
    </Anchor>
  ),
  Reveal: ({ content: Content, id: _id, puck: _puck, editMode: _editMode, ...props }) => (
    <Reveal {...props}>
      <Content />
    </Reveal>
  ),
  Tabs: ({ content: Content, id: _id, puck: _puck, editMode, ...props }) => (
    <Tabs {...props} editing={Boolean(editMode)}>
      <Content />
    </Tabs>
  ),
  TabPanel: ({ content: Content, id: _id, puck: _puck, editMode: _editMode, ...props }) => (
    <TabPanel {...props}>
      <Content />
    </TabPanel>
  ),
  Separator: ({ id: _id, puck: _puck, editMode: _editMode, ...props }) => <Separator {...props} />,
  Hero: ({ id: _id, puck: _puck, editMode: _editMode, ...props }) => <Hero {...props} />,
  Heading: ({ id: _id, puck: _puck, editMode: _editMode, ...props }) => <Heading {...props} />,
  RichText: ({ id: _id, puck: _puck, editMode: _editMode, ...props }) => <RichText {...props} />,
  ActionLinks: ({ id: _id, puck: _puck, editMode: _editMode, ...props }) => (
    <ActionLinks {...props} />
  ),
  MediaFigure: ({ id: _id, puck: _puck, editMode: _editMode, ...props }) => (
    <MediaFigure {...props} />
  ),
  MediaGallery: ({ id: _id, puck: _puck, editMode: _editMode, ...props }) => (
    <MediaGallery {...props} />
  ),
  Video: ({ id: _id, puck: _puck, editMode: _editMode, ...props }) => <Video {...props} />,
  ContentSection: ({ content: Content, id: _id, puck: _puck, editMode: _editMode, ...props }) => (
    <ContentSection {...props}>
      <Content />
    </ContentSection>
  ),
  MediaText: ({ content: Content, id: _id, puck: _puck, editMode: _editMode, ...props }) => (
    <MediaText {...props}>
      <Content />
    </MediaText>
  ),
};
