import {
  anchorPropsSchema,
  contentNavigationPropsSchema,
  scrollBoundaryPropsSchema,
  revealPropsSchema,
  actionLinksPropsSchema,
  contentSectionPropsSchema,
  headingPropsSchema,
  heroPropsSchema,
  tabsPropsSchema,
  tabPanelPropsSchema,
  separatorPropsSchema,
  mediaFigurePropsSchema,
  mediaGalleryPropsSchema,
  mediaTextPropsSchema,
  richTextPropsSchema,
  videoPropsSchema,
} from '@frontend/content-blocks/schema';
import { containerSchema, columnSchema, rowSchema, gridSchema } from './layout-schemas.js';

/** One schema inventory for current renderable and editable document components. */
export const componentSchemas = {
  Container: containerSchema,
  Row: rowSchema,
  Column: columnSchema,
  Grid: gridSchema,
  Hero: heroPropsSchema,
  Tabs: tabsPropsSchema,
  TabPanel: tabPanelPropsSchema,
  Separator: separatorPropsSchema,
  Heading: headingPropsSchema,
  RichText: richTextPropsSchema,
  ActionLinks: actionLinksPropsSchema,
  ContentSection: contentSectionPropsSchema,
  MediaFigure: mediaFigurePropsSchema,
  MediaText: mediaTextPropsSchema,
  MediaGallery: mediaGalleryPropsSchema,
  Video: videoPropsSchema,
  Anchor: anchorPropsSchema,
  Reveal: revealPropsSchema,
  ScrollBoundary: scrollBoundaryPropsSchema,
  ContentNavigation: contentNavigationPropsSchema,
};
export type ComponentName = keyof typeof componentSchemas;
export const COMPONENT_NAMES = Object.keys(componentSchemas).filter((name): name is ComponentName =>
  Object.hasOwn(componentSchemas, name)
);
export const SLOT_COMPONENTS = [
  'Tabs',
  'TabPanel',
  'Container',
  'Row',
  'Column',
  'Grid',
  'ContentSection',
  'MediaText',
  'Anchor',
  'Reveal',
  'ScrollBoundary',
  'ContentNavigation',
] as const satisfies readonly ComponentName[];
export type SlotComponentName = (typeof SLOT_COMPONENTS)[number];
export const SLOT_PROP = 'content';
export function hasContentSlot(name: string): boolean {
  return SLOT_COMPONENTS.some((component) => component === name);
}

export function slotAllowedTypes(name: string): readonly ComponentName[] {
  return name === 'Tabs' ? ['TabPanel'] : COMPONENT_NAMES;
}

/** Public runtime aliases share the adopted editor inventory; no schema is copied. */
export const documentComponentSchemas = componentSchemas;
export type DocumentComponentName = ComponentName;
export const DOCUMENT_COMPONENT_NAMES = COMPONENT_NAMES;
export const DOCUMENT_SLOT_COMPONENTS = SLOT_COMPONENTS;
export type DocumentSlotComponentName = SlotComponentName;
export const hasDocumentContentSlot = hasContentSlot;
export const documentSlotAllowedTypes = slotAllowedTypes;
