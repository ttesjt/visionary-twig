export { TEXT_LOCALES, DEFAULT_TEXT_LOCALE, TEXT_NAMESPACES, textLocale } from './configuration';
export type { TextLocale } from './configuration';
export {
  namespaceRegistry,
  TEXT_RESOURCE_VERSION,
  textDefinition,
  isTextNamespace,
} from './planning/registry';
export type { TextNamespaces, Namespace } from './planning/registry';
export { textNamespacePlan, textScopePlan } from './planning/plans';
export { createPreparedTextView, createPreparedTextResource } from './state/prepared-view';
