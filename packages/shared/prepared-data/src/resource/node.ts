import { z } from 'zod';
import {
  jsonNamespaceSchema,
  JSON_RESOURCE_PROTOCOL,
  jsonResourceManifestSchema,
  type JsonResourceManifest,
  validateJsonArtifact,
} from './index.js';
import { resolvePreparedJson } from '../preparation/source.js';
import { createServerImportMap } from '../preparation/server-imports.js';
import { preparedDataRevision } from '../preparation/files.js';
import type { PreparedDefinition } from '../preparation/contracts.js';
const definitionSchema = z.strictObject({
  version: z.number().int().positive(),
  kind: jsonResourceManifestSchema.shape.kind,
  resources: z.record(
    jsonNamespaceSchema,
    z.strictObject({
      schema: z.instanceof(z.ZodType),
      sourceSchema: z.instanceof(z.ZodType).optional(),
      schemaVersion: z.string().min(1),
      defaults: z.string().min(1),
      custom: z.string().min(1),
    })
  ),
});
export type JsonResourcesConfiguration = z.input<typeof definitionSchema>;
/** Uses the existing source policy, locks, freshness and atomic artifact transaction. */
export function jsonResourcesDefinition(configuration: unknown): PreparedDefinition {
  const config = definitionSchema.parse(configuration);
  const names = Object.keys(config.resources).sort();
  if (names.some((name) => ['prepared', 'manifest', 'resources'].includes(name)))
    throw new Error('Reserved JSON resource namespace.');
  if (!names.length) throw new Error('Declare at least one JSON resource.');
  return {
    namespace: config.kind,
    filename: 'prepared.json',
    contractVersion: config.version,
    async resolve(read, source) {
      const values: Record<string, unknown> = {};
      const resources: JsonResourceManifest['resources'] = {};
      for (const name of names) {
        const spec = config.resources[name];
        if (!spec) throw new Error('Missing JSON definition: ' + name);
        const value = await resolvePreparedJson(read, source, {
          defaults: spec.defaults,
          custom: spec.custom,
          parse: (value): unknown =>
            validateJsonArtifact(spec.schema, (spec.sourceSchema ?? spec.schema).parse(value)),
        });
        values[name] = value;
        resources[name] = {
          version: preparedDataRevision(value),
          schemaVersion: spec.schemaVersion,
        };
      }
      return {
        values,
        manifest: { version: JSON_RESOURCE_PROTOCOL, kind: config.kind, resources },
      };
    },
    additionalModules(input) {
      const catalog = z.object({ manifest: jsonResourceManifestSchema }).parse(input);
      return {
        'server-imports.ts': createServerImportMap(
          Object.keys(catalog.manifest.resources).map((name) => name + '.json')
        ),
      };
    },
    additionalFiles(input) {
      const catalog = z
        .strictObject({
          values: z.record(jsonNamespaceSchema, z.unknown()),
          manifest: z.unknown(),
        })
        .parse(input);
      const files: Record<string, unknown> = { 'resources.json': catalog.manifest };
      for (const [name, value] of Object.entries(catalog.values)) files[name + '.json'] = value;
      return files;
    },
  };
}
