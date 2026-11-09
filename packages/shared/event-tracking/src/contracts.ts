export type JsonValue = string | number | boolean | null | JsonObject | readonly JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };

export type TrackResult =
  | { readonly status: 'accepted'; readonly httpStatus: number }
  | { readonly status: 'skipped'; readonly reason: 'disabled' | 'unconfigured' }
  | {
      readonly status: 'failed';
      readonly reason:
        'unknown-project' | 'invalid-event' | 'invalid-data' | 'timeout' | 'network-error';
    }
  | { readonly status: 'failed'; readonly reason: 'http-error'; readonly httpStatus: number };

export interface TrackAttempt {
  readonly projectId: string;
  readonly event: string;
  readonly data: unknown;
}
export interface EventEnvelope {
  readonly projectId: string;
  readonly event: string;
  readonly data: JsonObject;
}
export interface SendRequest {
  readonly url: string;
  readonly envelope: EventEnvelope;
  readonly signal: AbortSignal;
}
export type EventSender = (request: SendRequest) => Promise<{ readonly httpStatus: number }>;
export interface ProjectConfig {
  readonly url: string | null;
  readonly validate?: (event: string, data: JsonObject) => boolean;
}
export interface TrackerOptions<Projects extends string> {
  readonly projects: { readonly [P in Projects]: ProjectConfig };
  readonly enabled?: boolean;
  readonly timeoutMs?: number;
  readonly sender?: EventSender;
  /** Runs only for attempts that stayed enabled until this callback starts. */
  readonly onResult?: (attempt: TrackAttempt, result: TrackResult) => void | Promise<void>;
}
