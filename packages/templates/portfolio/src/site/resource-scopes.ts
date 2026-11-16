import { PROJECT_TEXT_NAMESPACES } from './project-data';
import { defineScope } from '../infra/define-scope';
import { PROJECT_FILE_LAYOUT_NAMESPACES, PROJECT_FILE_SCOPES } from '../features/projects/files';

const definitions = {
  layout: defineScope({
    id: 'layout',
    text: ['main', ...PROJECT_TEXT_NAMESPACES],
    config: ['app'],
    content: ['base', ...PROJECT_FILE_LAYOUT_NAMESPACES],
  }),
  ...PROJECT_FILE_SCOPES,
  metadata: defineScope({
    id: 'metadata',
    text: ['main', ...PROJECT_TEXT_NAMESPACES],
    config: [],
    content: [],
  }),
  // The default main catalog is small. If it grows, give the 404 its own text namespace.
  notFound: defineScope({
    id: 'not-found',
    text: ['main', ...PROJECT_TEXT_NAMESPACES],
    config: [],
    content: [],
  }),
};
export type ResourceScopeDefinition =
  | (typeof definitions)[keyof typeof definitions]
  | (typeof PROJECT_FILE_SCOPES)[keyof typeof PROJECT_FILE_SCOPES];
export const RESOURCE_SCOPES = Object.freeze(definitions);
export type ResourceScopeId = ResourceScopeDefinition['id'];
