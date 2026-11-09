'use client';
import { useCallback, useMemo } from 'react';
import { type PreparedResources } from '@frontend/resource-runtime';
import type { ResourceScopeDefinition } from '../../../site/resource-scopes';
import { useOptionalTextScope } from '../text/client';
import { textLocale } from '../text';
import { useConfigScope, useContentScope } from '../json/provider';
import { selectPreparedResources } from '../preparation/prepared';
import { planResourceScope } from '../planning/scope-plan';

/** Host adapters publish prepared results. They never infer which scope to load. */
export function useResourceScopeBindings(scope: ResourceScopeDefinition) {
  const textContext = useOptionalTextScope();
  const configContext = useConfigScope();
  const contentContext = useContentScope();
  const text = scope.text.length ? textContext : undefined;
  const config = scope.config.length ? configContext : undefined;
  const content = scope.content.length ? contentContext : undefined;
  const locale = scope.text.length && text ? textLocale(text.plan.context.locale) : undefined;
  const target = useMemo(() => planResourceScope(scope, locale), [scope, locale]);
  const bindings = useMemo(() => {
    const byKind = { text, config, content };
    return target.parts.map((part) => {
      const binding = byKind[part.kind];
      if (!binding) throw new Error('Missing resource Provider for ' + part.kind);
      const prepared = binding.prepared;
      const seeds =
        prepared?.resources.filter((entry) =>
          part.plan.resources.some((resource) => resource.key === entry.key)
        ) ?? [];
      const available = new Set(seeds.map((entry) => entry.key));
      if (
        !binding.reader &&
        binding.plan.resources.some(
          (resource) =>
            !available.has(resource.key) &&
            !part.plan.resources.some((needed) => needed.key === resource.key)
        )
      )
        throw new Error('Resource scope omits unprepared Provider requirements for ' + part.kind);
      return {
        kind: part.kind,
        plan: part.plan,
        binding,
        seeds,
        installed: part.plan.resources.every((resource) => available.has(resource.key)),
      };
    });
  }, [target, text, config, content]);
  const initialResources = useMemo(() => bindings.flatMap((binding) => binding.seeds), [bindings]);
  const ready = bindings.every((value) => value.installed && value.binding.reader !== undefined);
  const publish = useCallback(
    (prepared: PreparedResources) => {
      if (prepared.planKey !== target.plan.key) return;
      // Validate all candidates against their nearest owner before any commit.
      const updates = bindings
        .filter((value) => !value.installed)
        .map(({ binding, plan }) =>
          binding.preparePublication(selectPreparedResources(plan, prepared.resources), plan)
        );
      for (const commit of updates) commit();
    },
    [bindings, target]
  );
  return { plan: target.plan, initialResources, ready, publish };
}
