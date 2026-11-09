export { editableDocument as inspectDocument } from './editing/editable-document.js';
export {
  readPath as readJsonPath,
  writePath as writeJsonPath,
  assertSafePath,
  isPrefix,
} from './bindings/paths.js';
export { snapshotJson, isJsonObject, isJsonArray } from './json/snapshot.js';
export { contentLimits } from './document/limits.js';
export { capture, fail } from './document/errors.js';
export type { EditableDocument } from './editing/editable-document.js';
export type { IndexedNode } from './registry/inspect-data.js';
export { bindingDestinations } from './bindings/targets.js';
