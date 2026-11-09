'use client';
export { useProjectFiles } from './files/use-project-files.js';
export type { ProjectFiles } from './files/use-project-files.js';
export { useBrowserProjectFiles } from './files/use-browser-project-files.js';
export { StudioFileControls } from './files/file-controls.js';
export type { StudioFileControlsProps } from './files/file-controls.js';
export { CatalogFileInput } from './files/catalog-file-input.js';
export { createBrowserFileAdapter } from './files/browser-files.js';
export type {
  StudioFileAdapter,
  StudioFileLocation,
  StudioFileSaveResult,
  StudioFileOpenResult,
} from './files/file-adapter.js';

export {
  StudioSaveActions,
  StudioOpenActions,
  type StudioFileActionsProps,
} from './files/file-actions.js';
export { StudioFileIdentity, StudioFileStatus } from './files/file-status.js';
export { StudioThemeControl, type StudioThemeControlProps } from './files/theme-control.js';
