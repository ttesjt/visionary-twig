import type {
  JsonObject,
  JsonValue,
  TrackerOptions,
  TrackAttempt,
  TrackResult,
  EventSender,
  ProjectConfig,
} from '../contracts.js';
import { snapshotJsonObject } from '../json/snapshot.js';
import { DEFAULT_TIMEOUT_MS, httpSender, sendEvent } from '../transport/http.js';
import { copyProjects } from './config.js';

// Interfaces need structural JSON checks; an index-signature constraint rejects valid payloads.
type JsonData<T> = T extends JsonValue
  ? T
  : T extends (...args: never[]) => unknown
    ? never
    : T extends object
      ? { [K in keyof T]: JsonData<T[K]> }
      : never;
type EventDefinitions<T> = {
  [P in keyof T]: {
    [E in keyof T[P]]: T[P][E] extends readonly unknown[]
      ? never
      : T[P][E] extends object
        ? JsonData<T[P][E]>
        : never;
  };
};
type FreeEvents = Record<string, Record<string, JsonObject>>;
const MAX_TIMEOUT_MS = 2_147_483_647;

/** Consumer-owned event trigger with a fixed project registry. */
export class EventTracker<Events extends EventDefinitions<Events> = FreeEvents> {
  readonly #projects: ReadonlyMap<string, ProjectConfig>;
  #enabled: boolean;
  #revocationCount = 0;
  readonly #timeoutMs: number;
  readonly #sender: EventSender;
  readonly #onResult: TrackerOptions<Extract<keyof Events, string>>['onResult'];

  constructor(options: TrackerOptions<Extract<keyof Events, string>>) {
    this.#projects = copyProjects(options.projects);
    this.#enabled = options.enabled ?? true;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (
      typeof this.#enabled !== 'boolean' ||
      !Number.isFinite(this.#timeoutMs) ||
      this.#timeoutMs <= 0 ||
      this.#timeoutMs > MAX_TIMEOUT_MS
    )
      throw new Error('Invalid event tracker configuration');
    this.#sender = options.sender ?? httpSender;
    this.#onResult = options.onResult;
    if (
      typeof this.#sender !== 'function' ||
      (this.#onResult !== undefined && typeof this.#onResult !== 'function')
    )
      throw new Error('Invalid event tracker callback');
  }

  /** Disabling also suppresses any result observer that has yet to start. */
  setEnabled(enabled: boolean): void {
    if (typeof enabled !== 'boolean') throw new TypeError('enabled must be a boolean');
    if (this.#enabled && !enabled) this.#revocationCount++;
    this.#enabled = enabled;
  }

  async track<P extends Extract<keyof Events, string>, E extends Extract<keyof Events[P], string>>(
    projectId: P,
    event: E,
    data: Events[P][E]
  ): Promise<TrackResult> {
    if (!this.#enabled) return { status: 'skipped', reason: 'disabled' };
    const revocationCount = this.#revocationCount;
    let attempt: TrackAttempt = { projectId, event, data };
    let result: TrackResult;
    const project = this.#projects.get(projectId);
    if (typeof projectId !== 'string' || !projectId.trim() || !project)
      result = { status: 'failed', reason: 'unknown-project' };
    else if (typeof event !== 'string' || !event.trim())
      result = { status: 'failed', reason: 'invalid-event' };
    else if (project.url === null) result = { status: 'skipped', reason: 'unconfigured' };
    else {
      try {
        const snapshot = snapshotJsonObject(data);
        attempt = { projectId, event, data: snapshot };
        if (project.validate && project.validate(event, snapshot) !== true)
          result = { status: 'failed', reason: 'invalid-data' };
        else
          result = await sendEvent(
            this.#sender,
            project.url,
            { projectId, event, data: snapshot },
            this.#timeoutMs
          );
      } catch {
        result = { status: 'failed', reason: 'invalid-data' };
      }
    }
    // Re-enabling applies to new events only. An older request keeps its delivery result.
    if (revocationCount !== this.#revocationCount) return result;
    try {
      await this.#onResult?.(attempt, result);
    } catch {
      console.warn('Event tracking result observer failed.');
    }
    return result;
  }
}
