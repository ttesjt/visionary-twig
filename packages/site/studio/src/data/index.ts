export {
  STUDIO_PROJECT_KIND,
  STUDIO_FORMAT_VERSION,
  DEFAULT_PROJECT_LOCALE,
  MAX_STUDIO_PROJECT_BYTES,
  MAX_PROJECT_HISTORY,
  localeSchema,
  publicationTargetSchema,
} from './project/schema.js';
export type { StudioProject, PublicationTarget } from './project/schema.js';
export {
  parseProject,
  encodeProject,
  projectFingerprint,
  contentFingerprint,
} from './project/parse.js';
export {
  importProject,
  projectFromDocument,
  createProject,
  projectContext,
} from './project/import.js';
export type { ImportProjectOptions } from './project/import.js';
export { projectIssues, preparePublication, projectNodes } from './project/validate.js';
export type { ProjectIssue, PublishSnapshot } from './project/validate.js';
export {
  catalogEntries,
  catalogReferences,
  setCatalogValue,
  renameCatalogKey,
  deleteCatalogKey,
  setCatalogPath,
} from './catalog/operations.js';
export type { CatalogEntry } from './catalog/operations.js';
export { bindProjectField, unbindProjectField, validateBoundValue } from './bindings/operations.js';
export {
  createProjectHistory,
  commitProject,
  undoProject,
  redoProject,
} from './session/history.js';
export type { ProjectHistory } from './session/history.js';
export type {
  StudioPublishing,
  StudioPublishTarget,
  PublicationChoice,
  ProjectLoadResult,
  ProjectPublishResult,
} from './publishing/contracts.js';

export { parseVariablePath, formatVariablePath } from './bindings/path-input.js';

export { setBindingSourceValue } from './bindings/operations.js';
