import type { ContentIssue, ContentVersion } from '@frontend/ui-document';
import type { PublicationTarget, StudioProject } from '../project/schema.js';
import type { PublishSnapshot } from '../project/validate.js';
export interface StudioPublishTarget {
  readonly id: string;
  readonly label: string;
}
export interface PublicationChoice {
  readonly key: string;
  readonly label: string;
}
export type ProjectLoadResult =
  | {
      readonly status: 'found';
      readonly published?: boolean;
      readonly project: StudioProject;
      readonly version: ContentVersion;
    }
  | { readonly status: 'not-found' | 'cancelled' }
  | { readonly status: 'invalid'; readonly errors: readonly ContentIssue[] }
  | { readonly status: 'unavailable'; readonly message: string };
export type ProjectPublishResult =
  | { readonly status: 'published'; readonly version: ContentVersion }
  | { readonly status: 'conflict' | 'cancelled' }
  | { readonly status: 'invalid'; readonly errors: readonly ContentIssue[] }
  | { readonly status: 'unavailable'; readonly message: string };
/** App-owned composition; core has no storage, HTTP or provider selection. */
export interface StudioPublishing {
  readonly targets: readonly StudioPublishTarget[];
  list?(targetId: string, signal: AbortSignal): Promise<readonly PublicationChoice[]>;
  load(target: PublicationTarget, signal: AbortSignal): Promise<ProjectLoadResult>;
  publish(
    target: PublicationTarget,
    snapshot: PublishSnapshot,
    signal: AbortSignal
  ): Promise<ProjectPublishResult>;
}
