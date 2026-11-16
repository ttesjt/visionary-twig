export {
  textLocale,
  isTextNamespace,
  textDefinition,
  TEXT_LOCALES,
  DEFAULT_TEXT_LOCALE,
  TEXT_RESOURCE_VERSION,
} from './text';
export type { TextLocale } from './text';
export { splitScopeSnapshot, type ScopeSnapshots } from './planning/snapshots';
export { RESOURCE_SCOPES } from '../../site/resource-scopes';
export type { ResourceScopeDefinition, ResourceScopeId } from '../../site/resource-scopes';

export { RESOURCE_STARTUP_TEXT } from '../../site/startup-text';

export { jsonDefinition } from './json/registry';

export { planResourceScope } from './planning/scope-plan';
