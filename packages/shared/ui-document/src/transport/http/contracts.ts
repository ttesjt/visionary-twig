import type { DocumentOptions } from '../../document/types.js';
import type { ContentRegistry } from '../../registry/contracts.js';

interface HttpEndpoint {
  readonly urlForKey: (key: string) => string | URL;
  readonly headers?: Readonly<Record<string, string>>;
  readonly cache?: RequestInit['cache'];
  readonly credentials?: RequestInit['credentials'];
}

export interface HttpReadEndpoint extends HttpEndpoint {
  readonly method: 'GET';
}

export interface HttpWriteEndpoint extends HttpEndpoint {
  readonly method: 'POST' | 'PUT' | 'PATCH';
  /** Map requested preconditions explicitly. Missing mappings never discard conditions. */
  readonly preconditionHeaders?: {
    readonly revision?: string;
    readonly etag?: string;
  };
}

export interface HttpTransportOptions {
  /** Exact, trusted HTTP(S) origin. Per-key URLs and redirects cannot change it. */
  readonly origin: string;
  readonly versionHeaders: { readonly revision: string; readonly etag?: string };
  readonly fetch?: typeof globalThis.fetch;
  readonly timeoutMs?: number;
  readonly maxResponseBytes?: number;
}

export interface HttpSourceOptions extends HttpTransportOptions {
  readonly endpoint?: HttpReadEndpoint;
}

export interface HttpSinkOptions extends HttpTransportOptions, DocumentOptions {
  readonly registry: ContentRegistry;
  readonly endpoint?: HttpWriteEndpoint;
}
