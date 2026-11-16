'use client';
import { useMemo } from 'react';
import { useNamespaceOwner } from '../state/namespace-owner';
import { createResourceProvider } from '../state/resource-provider';
import {
  JsonResource,
  type JsonReadView,
  type JsonSchemas,
} from '@frontend/prepared-data/resource';
import { type ResourcePlan, type PreparedResources } from '@frontend/resource-runtime';
import type { ResourceScopeDefinition } from '../../../site/resource-scopes';
import { configSchemas, contentSchemas, jsonPlan, type JsonKind } from './registry';
import { createContentReader } from './content-reader';
import { createPreparedJsonResource } from './resource';
export function createJsonProvider<R extends JsonSchemas, S, V extends JsonReadView<R>>(
  kind: JsonKind,
  schemas: R,
  planForScope: (scope: S) => ResourcePlan,
  readerFor: (raw: JsonReadView<R>) => V
) {
  const build = (data: PreparedResources, plan: ResourcePlan) =>
    createPreparedJsonResource(schemas, kind, data, plan);
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
