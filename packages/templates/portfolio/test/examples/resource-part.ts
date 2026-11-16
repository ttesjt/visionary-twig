import {
  planResourceScope,
  DEFAULT_TEXT_LOCALE,
  type TextLocale,
  type ResourceScopeDefinition,
} from '../../src/infra/resources';

/** Select the actual per-kind plan produced for this starter fixture. */
export function resourcePart(
  kind: 'text' | 'config' | 'content',
  scope: ResourceScopeDefinition,
  locale: TextLocale = DEFAULT_TEXT_LOCALE
) {
  const part = planResourceScope(scope, locale).parts.find((part) => part.kind === kind);
  if (!part) throw new Error('Fixture scope lacks ' + kind + ': ' + scope.id);
  return part.plan;
}
