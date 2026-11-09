# Event tracking

Portable, vendor-independent event trigger for browsers and Node. No runtime dependencies, implicit identity, import-time network calls, persistence or retries.

Applications create and own their tracker instance.

```ts
import { EventTracker } from '@frontend/event-tracking';

type Events = { site: { opened: { itemId: string } } };
const tracker = new EventTracker<Events>({
  projects: { site: { url: null } },
  onResult(attempt, result) {
    // Optional local observer; branch on result.status.
    void attempt;
    void result;
  },
});
void tracker.track('site', 'opened', { itemId: 'sample' });
```

Each registered project takes an absolute HTTP(S) URL or explicit `null`. The registry is fixed at construction. For a valid project and event, an enabled tracker returns `skipped/unconfigured` when the project URL is `null`.

Tracking starts enabled by default. Pass `enabled: false` to start disabled, then use `tracker.setEnabled(true)` or `tracker.setEnabled(false)` on the same instance. While disabled, every `track()` call returns `skipped/disabled` before checking keys or data, sending, or invoking `onResult`. Skipped events are discarded.

A configured trigger POSTs exactly `{projectId,event,data}`. Data must be a plain JSON object (no undefined, accessors, cycles, special objects or non-finite numbers). It is copied and frozen before asynchronous delivery. A project may declare `validate(event,data): boolean`; false or a thrown error returns failed/invalid-data without sending. No schema library is required.

Results resolve to accepted (HTTP 2xx, not an ingestion guarantee), skipped or failed (unknown-project, invalid-event, invalid-data, timeout, network-error, http-error). HTTP errors include httpStatus. Responses need not contain JSON. Once HTTP status arrives, response-body cleanup is best effort; cleanup failures or delays do not change that status. Default delivery uses native fetch, a named 5000ms timeout and no retry. Redirect/CORS behavior follows fetch; browser endpoints must allow the request. Navigation/unload delivery is not guaranteed.

The optional `onResult(attempt, result)` runs once for each attempt that stays enabled until the callback starts, including failures and unconfigured projects. Disabling during delivery suppresses its pending callback, even if tracking is enabled again before the request settles. The caller still receives the delivery result. A callback already running is awaited to completion.

Observers receive the original input when validation was skipped. Keep observer work bounded because `track()` awaits it. An observer exception produces a fixed, payload-free warning and preserves the tracking result.

An injected EventSender receives URL, immutable envelope and AbortSignal, and returns an HTTP status. It obeys the same deadline and acceptance semantics. Use it for alternate protocols/adapters; local logging belongs in onResult and must not claim HTTP acceptance. App configuration may resolve a relative endpoint; secret authentication must stay on the server.

Declare event/payload types or interfaces (including nested interfaces) for strict projects; use an explicit `Record<string, JsonObject>` project for free-form events. A typed project has no permissive fallback overload. No React context or provider is needed.
