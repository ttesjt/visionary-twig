import { z } from 'zod';
import { freezePreparedData } from '../index.js';
import { validateJsonArtifact } from './artifact.js';
export { sameJson, validateJsonArtifact } from './artifact.js';
export const JSON_RESOURCE_PROTOCOL = 1;
export const jsonNamespaceSchema = z.string().regex(/^[a-z][a-z0-9-]*$/);
export const jsonResourceManifestSchema = z.strictObject({
  version: z.literal(JSON_RESOURCE_PROTOCOL),
  kind: z.enum(['config', 'content']),
  resources: z.record(
    jsonNamespaceSchema,
    z.strictObject({
      version: z.string().min(1),
      schemaVersion: z.string().min(1),
    })
  ),
});
export type JsonResourceManifest = z.output<typeof jsonResourceManifestSchema>;
export type JsonSchemas = Readonly<Record<string, z.ZodType>>;
export type DeepReadonly<T> = T extends readonly unknown[]
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
export interface JsonReadView<R extends JsonSchemas> {
  readonly namespaces: readonly string[];
  has(namespace: string, version?: string): boolean;
  get<N extends keyof R & string>(namespace: N): DeepReadonly<z.output<R[N]>>;
}
export interface JsonResourceInput<R extends JsonSchemas> {
  readonly namespace: keyof R & string;
  readonly version: string;
  readonly value: unknown;
}
/** Owns schema-validated immutable values. Loading and React publication belong to the host. */
export class JsonResource<R extends JsonSchemas> {
  private readonly entries = new Map<
    string,
    { readonly version: string; readonly value: unknown }
  >();
  constructor(schemas: R, inputs: readonly JsonResourceInput<R>[]) {
    for (const input of inputs) {
      jsonNamespaceSchema.parse(input.namespace);
      if (this.entries.has(input.namespace))
        throw new Error('Duplicate JSON namespace: ' + input.namespace);
      const schema = Object.hasOwn(schemas, input.namespace) ? schemas[input.namespace] : undefined;
      if (!schema || !input.version.trim())
        throw new Error('Unknown or unversioned JSON namespace: ' + input.namespace);
      const value = validateJsonArtifact(schema, input.value);
      freezePreparedData(value);
      this.entries.set(input.namespace, Object.freeze({ version: input.version, value }));
    }
  }
  createView(parent?: JsonReadView<R>): JsonReadView<R> {
    const entries = this.entries;
    for (const namespace of entries.keys())
      if (parent?.namespaces.includes(namespace))
        throw new Error('Inherited JSON namespace collision: ' + namespace);
    return Object.freeze({
      namespaces: Object.freeze([...(parent?.namespaces ?? []), ...entries.keys()]),
      has(namespace: string, version?: string): boolean {
        const entry = entries.get(namespace);
        return entry
          ? version === undefined || entry.version === version
          : (parent?.has(namespace, version) ?? false);
      },
      get<N extends keyof R & string>(namespace: N): DeepReadonly<z.output<R[N]>> {
        const entry = entries.get(namespace);
        if (!entry) {
          if (parent) return parent.get(namespace);
          throw new Error('JSON namespace is not prepared: ' + namespace);
        }
        // The constructor validated this key with schemas[namespace] and froze its owned output.
        // This assertion preserves that heterogeneous key/output relationship across Map storage.
        return entry.value as DeepReadonly<z.output<R[N]>>;
      },
    });
  }
}
