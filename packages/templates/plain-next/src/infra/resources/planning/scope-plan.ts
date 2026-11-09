import { createResourcePlan, type ResourcePlan } from '@frontend/resource-runtime';
import { RESOURCE_KINDS, type ResourceKind } from '../constants/kinds';
import type { ResourceScopeDefinition } from '../../../site/resource-scopes';
import { textScopePlan } from '../text';
import type { TextLocale } from '../text';
import { jsonPlan } from '../json/registry';

export interface ScopePlan {
  readonly plan: ResourcePlan;
  readonly parts: readonly { readonly kind: ResourceKind; readonly plan: ResourcePlan }[];
}
/** Resource membership comes only from the explicit scope; providers supply no requirements. */
export function planResourceScope(scope: ResourceScopeDefinition, locale?: TextLocale): ScopePlan {
  const parts: ScopePlan['parts'][number][] = [];
  for (const kind of RESOURCE_KINDS) {
    if (!scope[kind].length) continue;
    if (kind === 'text') {
      if (locale === undefined) throw new Error('Text requirements need a selected locale.');
      parts.push({ kind, plan: textScopePlan(locale, scope) });
    } else parts.push({ kind, plan: jsonPlan(kind, scope) });
  }
  return Object.freeze({
    plan: createResourcePlan(
      parts.flatMap((part) => part.plan.resources),
      {
        scope: scope.id,
        ...(scope.text.length && locale ? { locale } : {}),
      }
    ),
    parts: Object.freeze(parts.map((part) => Object.freeze(part))),
  });
}
