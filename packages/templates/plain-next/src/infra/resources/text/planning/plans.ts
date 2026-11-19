import { createResourcePlan, type ResourcePlan } from '@frontend/resource-runtime';
import type { ResourceScopeDefinition, ResourceScopeId } from '../../../../site/resource-scopes';
import { isTextNamespace, textDefinition, type TextLocale, type Namespace } from './registry';

const TEXT_TRANSITION_SCOPE_ID = 'transition';
/** Editable declarations are resolved against the prepared registry, including empty starters. */
export function registeredTextNamespaces(namespaces: readonly string[]): readonly Namespace[] {
  return namespaces.map((namespace) => {
    if (!isTextNamespace(namespace)) throw new Error('Unknown text namespace: ' + namespace);
    return namespace;
  });
}
export function textNamespacePlan(
  locale: TextLocale,
  namespaces: readonly Namespace[],
  scopeId: ResourceScopeId | typeof TEXT_TRANSITION_SCOPE_ID = TEXT_TRANSITION_SCOPE_ID
): ResourcePlan {
  return createResourcePlan(
    namespaces.map((namespace) => textDefinition(namespace, locale)),
    { locale, page: scopeId }
  );
}

/** Both Provider and server planning consume the same complete host declaration. */
export function textScopePlan(locale: TextLocale, scope: ResourceScopeDefinition): ResourcePlan {
  return textNamespacePlan(locale, registeredTextNamespaces(scope.text), scope.id);
}
