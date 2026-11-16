import {
  jsonResourceManifestSchema,
  validateJsonArtifact,
  type JsonSchemas,
  type JsonResourceManifest,
} from '@frontend/prepared-data/resource';
import type { ResourcePlan, ResourceDefinition } from '@frontend/resource-runtime';
import { createResourcePlan } from '@frontend/resource-runtime';
import { configSchemas } from '../../../site/config-schema';
import { contentSchemas } from '../../../site/content-schemas';
import configManifest from '../../../../.generated/config/resources.json';
import contentManifest from '../../../../.generated/content/resources.json';
import type { ResourceScopeDefinition } from '../../../site/resource-scopes';
export { configSchemas };
export { contentSchemas };
export type JsonKind = JsonResourceManifest['kind'];
const registries: Readonly<
  Record<JsonKind, { schemas: JsonSchemas; manifest: JsonResourceManifest }>
> = {
  config: { schemas: configSchemas, manifest: jsonResourceManifestSchema.parse(configManifest) },
  content: { schemas: contentSchemas, manifest: jsonResourceManifestSchema.parse(contentManifest) },
};
export function jsonDefinition(kind: JsonKind, namespace: string): ResourceDefinition {
  const registry = registries[kind];
  const schema = Object.hasOwn(registry.schemas, namespace)
    ? registry.schemas[namespace]
    : undefined;
  const spec = registry.manifest.resources[namespace];
  if (registry.manifest.kind !== kind || !schema || !spec)
    throw new Error('Unknown JSON resource: ' + kind + '/' + namespace);
  return {
    id: kind + ':' + namespace,
    url: '/resources/json/' + kind + '/' + spec.version + '/' + namespace + '.json',
    source: kind,
    version: spec.version,
    schemaVersion: spec.schemaVersion,
    validateArtifact(input: unknown): undefined {
      validateJsonArtifact(schema, input);
    },
  };
}
export function jsonPlan(kind: JsonKind, scope: ResourceScopeDefinition): ResourcePlan {
  return createResourcePlan(
    scope[kind].map((namespace) => jsonDefinition(kind, namespace)),
    { scope: scope.id, kind }
  );
}
