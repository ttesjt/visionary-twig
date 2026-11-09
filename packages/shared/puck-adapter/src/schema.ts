export { contentRegistry, createContentRegistry } from './registry/content-registry.js';
export {
  componentSchemas,
  COMPONENT_NAMES,
  SLOT_COMPONENTS,
  SLOT_PROP,
} from './registry/catalog.js';
export type { ComponentName, SlotComponentName } from './registry/catalog.js';

export { normalizePuckInput } from './registry/normalize-puck-input.js';
export { collectContentMedia } from './registry/content-media.js';

export {
  documentComponentSchemas,
  DOCUMENT_COMPONENT_NAMES,
  DOCUMENT_SLOT_COMPONENTS,
} from './registry/catalog.js';
export type { DocumentComponentName, DocumentSlotComponentName } from './registry/catalog.js';
