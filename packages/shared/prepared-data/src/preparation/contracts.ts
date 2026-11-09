import { z } from 'zod';
export const DEFAULT_PREPARED_SOURCE = 'auto';
export const PREPARED_SOURCES = ['auto', 'default', 'custom'] as const;
export const preparedSourceSchema = z.enum(PREPARED_SOURCES);
export type PreparedSource = z.infer<typeof preparedSourceSchema>;
export const PREPARED_MANIFEST_VERSION = 1;
export const preparedManifestSchema = z.strictObject({
  version: z.literal(PREPARED_MANIFEST_VERSION),
  contractVersion: z.number().int().positive(),
  source: preparedSourceSchema,
  inputs: z.record(z.string(), z.string().nullable()),
  artifactHash: z.string(),
  files: z.record(z.string(), z.string()).optional(),
});
/** Optional reads still validate paths and record absence for freshness checks. */
export type PreparedInputReader = (
  relative: string,
  options?: { readonly optional?: boolean; readonly format?: 'json' | 'text' }
) => Promise<unknown>;
export interface PreparedDefinition {
  readonly namespace: string;
  readonly filename: string;
  readonly contractVersion: number;
  /** Additional JSON files replaced atomically with the canonical artifact. */
  readonly additionalFiles?: (value: unknown) => Readonly<Record<string, unknown>>;
  /** Generated TypeScript modules share the artifact transaction and freshness inventory. */
  readonly additionalModules?: (value: unknown) => Readonly<Record<string, string>>;
  readonly resolve: (read: PreparedInputReader, source: PreparedSource) => Promise<unknown>;
}
export interface ResolvedPrepared {
  readonly definition: PreparedDefinition;
  readonly value: unknown;
  readonly content: string;
  readonly manifest: z.infer<typeof preparedManifestSchema>;
}

/** Exact generated files used as the basis of cross-namespace validation. */
export interface PreparedState {
  readonly app: string;
  readonly files: Readonly<Record<string, string | null>>;
  readonly inventories?: Readonly<Record<string, readonly string[] | null>>;
}
