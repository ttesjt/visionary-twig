export interface ResourceDefinition {
  readonly id: string;
  readonly url: string;
  readonly version: string;
  readonly schemaVersion: string;
  readonly source: string;
  /** Checks the frozen artifact. Throw on invalid input; source conversion belongs to the reader or preparation step. */
  readonly validateArtifact: (value: unknown) => undefined;
}
export interface PlannedResource extends ResourceDefinition {
  readonly key: string;
}
export interface ResourcePlan {
  readonly key: string;
  readonly context: Readonly<Record<string, string>>;
  readonly resources: readonly PlannedResource[];
}
export interface PreparedResource {
  readonly key: string;
  readonly value: unknown;
}
export interface PreparedResources {
  readonly planKey: string;
  readonly context: Readonly<Record<string, string>>;
  readonly resources: readonly PreparedResource[];
}
export interface ResourceSnapshot {
  readonly version: 1;
  readonly planKey: string;
  readonly resources: readonly PreparedResource[];
}
export type ResourceReader = (resource: PlannedResource, signal: AbortSignal) => Promise<unknown>;
export interface ResourceFetcher {
  (resource: PlannedResource, signal?: AbortSignal): Promise<PreparedResource>;
  dispose(): void;
}
export type ResourceErrorKind =
  | 'definition'
  | 'snapshot'
  | 'http'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'invalid-json'
  | 'invalid-data'
  | 'capacity'
  | 'too-large';
export class ResourceError extends Error {
  constructor(
    readonly kind: ResourceErrorKind,
    readonly resourceId: string,
    options?: ErrorOptions
  ) {
    super(`Resource ${kind}: ${resourceId}`, options);
    this.name = 'ResourceError';
  }
}
