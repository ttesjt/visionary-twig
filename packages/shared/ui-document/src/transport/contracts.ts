import type { ContentIssue } from '../document/errors.js';

export interface ContentVersion {
  readonly revision: number;
  readonly etag?: string;
}

export interface ReadOptions {
  readonly signal?: AbortSignal;
}

export interface SaveOptions extends ReadOptions {
  /** Zero means create only; otherwise compare with the persisted revision. */
  readonly expectedRevision?: number;
  readonly expectedEtag?: string;
  /** External variables already loaded as one consistent snapshot by the host. */
  readonly context?: unknown;
}

export interface ContentUnavailable {
  readonly status: 'unavailable';
  readonly reason:
    | 'unconfigured'
    | 'network'
    | 'timeout'
    | 'http'
    | 'invalid-response'
    | 'response-too-large'
    | 'unsafe-endpoint';
  readonly message: string;
  readonly httpStatus?: number;
}

export type ContentReadResult =
  | {
      readonly status: 'found';
      readonly rawJson: string;
      readonly version: ContentVersion;
      readonly context?: unknown;
    }
  | { readonly status: 'not-found' }
  | { readonly status: 'cancelled' }
  | ContentUnavailable;

export type ContentSaveResult =
  | { readonly status: 'saved'; readonly version: ContentVersion }
  | { readonly status: 'conflict'; readonly currentVersion?: ContentVersion }
  | { readonly status: 'invalid'; readonly errors: readonly ContentIssue[] }
  | { readonly status: 'cancelled' }
  | ContentUnavailable;

export interface ContentSource {
  read(key: string, options?: ReadOptions): Promise<ContentReadResult>;
}

export interface ContentSink {
  save(key: string, document: unknown, options?: SaveOptions): Promise<ContentSaveResult>;
}

export interface ContentStore extends ContentSource, ContentSink {}
