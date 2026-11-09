import type { JsonObject } from '../json/snapshot.js';
import type { ContentLimits } from './limits.js';

export const CONTENT_SCHEMA_VERSION = 1;

export interface ContentNode {
  readonly type: string;
  readonly props: JsonObject & { readonly id: string };
  readonly readOnly?: Readonly<Record<string, boolean>>;
}

export interface ContentData {
  readonly root: {
    readonly props?: JsonObject;
    readonly readOnly?: Readonly<Record<string, boolean>>;
  };
  readonly content: readonly ContentNode[];
}

export interface ContentBinding {
  readonly nodeId: string;
  readonly targetPath: readonly string[];
  readonly sourcePath: readonly string[];
}

export interface ContentDocument {
  readonly documentId: string;
  readonly schemaVersion: typeof CONTENT_SCHEMA_VERSION;
  readonly revision: number;
  readonly locale?: string;
  readonly data: ContentData;
  readonly variables?: JsonObject;
  readonly bindings?: readonly ContentBinding[];
}

export interface DocumentOptions {
  readonly limits?: Partial<ContentLimits>;
}

export interface ResolveOptions extends DocumentOptions {
  readonly context?: unknown;
}

export interface ResolvedDocument {
  /** Original bindings and placeholders, ready for an editing or persistence boundary. */
  readonly document: ContentDocument;
  readonly data: ContentData;
  readonly metadata: {
    readonly documentId: string;
    readonly revision: number;
    readonly nodeCount: number;
    readonly bindingCount: number;
    readonly locale?: string;
  };
}
