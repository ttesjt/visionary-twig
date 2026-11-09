import { createResourcePlan, type ResourcePlan } from '@frontend/resource-runtime';
import type { ResourceScopeDefinition, ResourceScopeId } from '../../../../site/resource-scopes';
import { textDefinition, type TextLocale, type Namespace } from './registry';

const TEXT_TRANSITION_SCOPE_ID = 'transition';
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
  return textNamespacePlan(locale, scope.text, scope.id);
}
