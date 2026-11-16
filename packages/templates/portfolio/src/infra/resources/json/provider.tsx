'use client';
import { useMemo } from 'react';
import { useNamespaceOwner } from '../state/namespace-owner';
import { createResourceProvider } from '../state/resource-provider';
import {
  JsonResource,
  type JsonReadView,
  type JsonSchemas,
  type JsonResourceInput,
} from '@frontend/prepared-data/resource';
import { type ResourcePlan, type PreparedResources } from '@frontend/resource-runtime';
import type { ResourceScopeDefinition } from '../../../site/resource-scopes';
import { configSchemas, contentSchemas, jsonPlan, type JsonKind } from './registry';
import { createContentReader } from './content-reader';
function known<R extends JsonSchemas>(schemas: R, name: string): name is keyof R & string {
  return Object.hasOwn(schemas, name);
}
function resource<R extends JsonSchemas>(
  schemas: R,
  kind: JsonKind,
  prepared: PreparedResources,
  plan: ResourcePlan
): JsonResource<R> {
  if (prepared.planKey !== plan.key || prepared.resources.length !== plan.resources.length)
    throw new Error('JSON preparation plan mismatch.');
  const inputs: JsonResourceInput<R>[] = plan.resources.map((definition) => {
    const name = definition.id.slice(kind.length + 1);
    const entry = prepared.resources.find((value) => value.key === definition.key);
    if (!known(schemas, name) || !entry) throw new Error('Missing JSON namespace: ' + name);
    return { namespace: name, version: definition.version, value: entry.value };
  });
  return new JsonResource(schemas, inputs);
}
export function createJsonProvider<R extends JsonSchemas, S, V extends JsonReadView<R>>(
  kind: JsonKind,
  schemas: R,
  planForScope: (scope: S) => ResourcePlan,
  readerFor: (raw: JsonReadView<R>) => V
) {
  const build = (data: PreparedResources, plan: ResourcePlan) =>
    resource(schemas, kind, data, plan);
  const view = (local: JsonResource<R>, parent: V | undefined) =>
    readerFor(local.createView(parent));
  const binding = createResourceProvider<S, JsonResource<R>, V>(
    function useJsonOwner(scope, initialSnapshot, parent) {
      const plan = useMemo(() => planForScope(scope), [scope]);
      return useNamespaceOwner({ plan, initialPlan: plan, initialSnapshot, parent, build, view });
    },
    { unready: 'JSON scope is not ready: ' + kind }
  );
  return {
    Provider: binding.Provider,
    useScope: binding.useOptionalScope,
    useReader: binding.useReader,
  };
}
const config = createJsonProvider(
  'config',
  configSchemas,
  (scope: ResourceScopeDefinition) => jsonPlan('config', scope),
  (raw) => raw
);
const content = createJsonProvider(
  'content',
  contentSchemas,
  (scope: ResourceScopeDefinition) => jsonPlan('content', scope),
  createContentReader
);
export const AppConfigProvider = config.Provider;
export const ContentProvider = content.Provider;
export const useAppConfig = config.useReader;
export const useContent = content.useReader;
export const useConfigScope = config.useScope;
export const useContentScope = content.useScope;
