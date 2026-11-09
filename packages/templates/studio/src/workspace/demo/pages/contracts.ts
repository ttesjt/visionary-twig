import type { StudioProject } from '@frontend/studio/data';
import type { ContentIssue } from '@frontend/ui-document';
export const DEMO_PAGE_TARGET = 'demo-pages';
export interface DemoPageSummary {
  readonly id: string;
  readonly title: string;
  readonly revision: number;
}
export interface DemoPage extends DemoPageSummary {
  readonly project: StudioProject;
  readonly itemId: string | null;
}
export type DemoPageResult =
  | { readonly status: 'found'; readonly page: DemoPage }
  | { readonly status: 'not-found' | 'conflict' | 'cancelled' }
  | { readonly status: 'invalid'; readonly errors: readonly ContentIssue[] };
export interface DemoPageWrite {
  readonly id: string;
  readonly title: string;
  readonly expectedRevision: number;
  readonly expectedItemId: string | null;
  readonly itemId: string | null;
  readonly project: unknown;
  readonly locales: readonly string[];
}
export interface DemoPageUnlink {
  readonly id: string;
  readonly expectedRevision: number;
  readonly expectedItemId: string;
}
export interface DemoPageAdapter {
  getSnapshot(this: void): readonly DemoPageSummary[];
  subscribe(this: void, listener: () => void): () => void;
  load(this: void, id: string, signal: AbortSignal): Promise<DemoPageResult>;
  publish(this: void, input: DemoPageWrite, signal: AbortSignal): Promise<DemoPageResult>;
  unlink(this: void, input: DemoPageUnlink, signal: AbortSignal): Promise<DemoPageResult>;
}
