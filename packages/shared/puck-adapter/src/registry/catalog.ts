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

/** Existing editor component inventory. New JSON-only composition blocks stay separate
 * until the independently maintained editor adopts them. */
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
] as const satisfies readonly ComponentName[];
export type SlotComponentName = (typeof SLOT_COMPONENTS)[number];
export const SLOT_PROP = 'content';
export function hasContentSlot(name: string): boolean {
  return SLOT_COMPONENTS.some((component) => component === name);
}

export function slotAllowedTypes(name: string): readonly ComponentName[] {
  return name === 'Tabs' ? ['TabPanel'] : COMPONENT_NAMES;
}

/** Serializable runtime inventory; does not require editor fields or default values. */
export const documentComponentSchemas = {
  ...componentSchemas,
  Anchor: anchorPropsSchema,
  Reveal: revealPropsSchema,
  ScrollBoundary: scrollBoundaryPropsSchema,
  ContentNavigation: contentNavigationPropsSchema,
};
export type DocumentComponentName = keyof typeof documentComponentSchemas;
export const DOCUMENT_COMPONENT_NAMES = Object.keys(documentComponentSchemas).filter(
  (name): name is DocumentComponentName => Object.hasOwn(documentComponentSchemas, name)
);
export const DOCUMENT_SLOT_COMPONENTS = [
  ...SLOT_COMPONENTS,
  'Anchor',
  'Reveal',
  'ScrollBoundary',
  'ContentNavigation',
] as const;
export type DocumentSlotComponentName = (typeof DOCUMENT_SLOT_COMPONENTS)[number];
export function hasDocumentContentSlot(name: string): boolean {
  return DOCUMENT_SLOT_COMPONENTS.some((component) => component === name);
}
export function documentSlotAllowedTypes(name: string): readonly DocumentComponentName[] {
  return name === 'Tabs' ? ['TabPanel'] : DOCUMENT_COMPONENT_NAMES;
}
