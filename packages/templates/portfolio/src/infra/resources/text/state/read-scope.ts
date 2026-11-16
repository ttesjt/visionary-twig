'use client';
import { useMemo, useLayoutEffect, useId, useCallback } from 'react';
import type { PreparedResources, ResourcePlan } from '@frontend/resource-runtime';
import type { TextReadView, TextResource } from '@frontend/text-catalog/resource';
import type { ResourceScopeDefinition } from '../../../../site/resource-scopes';
import { isTextNamespace, textLocale, type TextNamespaces } from '../planning/registry';
import { textScopePlan, textNamespacePlan } from '../planning/plans';
import { selectPreparedResources } from '../../preparation/prepared';
import { useNamespaceOwner } from '../../state/namespace-owner';
import { createResourceProvider, type ResourceProviderScope } from '../../state/resource-provider';
import { useTextController } from './locale-controller';
import { createPreparedTextResource } from './prepared-view';

type TextScope = ResourceProviderScope<TextResource<TextNamespaces>, TextReadView<TextNamespaces>>;

function view(
  resource: ReturnType<typeof createPreparedTextResource>,
  parent: TextScope['reader'],
  plan: ResourcePlan
) {
  return resource.createView(textLocale(plan.context.locale), parent ? { parent } : {});
}
function validateTextRequest(request: ResourcePlan, active: ResourcePlan) {
  if (request.context.locale !== active.context.locale)
    throw new Error('Namespace publication locale mismatch.');
}
function useTextOwner(
  scope: ResourceScopeDefinition,
  initialSnapshot: unknown,
  parent: TextScope | undefined
) {
  const { selection, initialLocale, replan, retainScope } = useTextController();
  const plan = useMemo(() => textScopePlan(selection.locale, scope), [selection.locale, scope]);
  const initialPlan = useMemo(() => textScopePlan(initialLocale, scope), [initialLocale, scope]);
  const owner = useNamespaceOwner({
    plan,
    initialPlan,
    initialSnapshot,
    parent,
    build: createPreparedTextResource,
    view,
    onMembershipChange: replan,
    validateRequest: validateTextRequest,
  });
  const { plan: effective, preparePlanChange } = owner;
  const namespaces = useMemo(
    () =>
      effective.resources.map((entry) => {
        if (!isTextNamespace(entry.id)) throw new Error('Unknown text namespace: ' + entry.id);
        return entry.id;
      }),
    [effective]
  );
  const stage = useCallback(
    (transition: PreparedResources) => {
      const locale = textLocale(transition.context.locale);
      const target = textNamespacePlan(locale, namespaces, scope.id);
      return preparePlanChange(textScopePlan(locale, scope), {
        plan: target,
        prepared: selectPreparedResources(target, transition.resources),
      });
    },
    [scope, namespaces, preparePlanChange]
  );
  const id = useId();
  useLayoutEffect(() => retainScope(id, namespaces, stage), [retainScope, id, namespaces, stage]);
  return owner;
}

const text = createResourceProvider(useTextOwner, {
  missing: 'Missing TextProvider.',
  unready: 'Text scope is not prepared. Render consumers inside its Guardian.',
});
export const PreparedTextScope = text.Provider;
export const useOptionalTextScope = text.useOptionalScope;
export const useTextScope = text.useScope;
export const useText = text.useReader;
