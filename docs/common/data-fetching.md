# Data fetching and feature gates

Use a domain hook with SWR for browser data that needs shared caching, loading/error state and revalidation. Keep the fetcher, response schema, defaults and key in the owning application's domain folder, for example `src/data/remote-settings/`. Do not wrap every fetch in a universal framework.

All app starters declare SWR as an optional-to-use default dependency. Installation does not issue requests. The Web starter's `/examples/remote-settings` page uses neutral static JSON, two independent consumers and visible layout changes. The main layout does not fetch flags. No control backend or experiment assignment system is included.

## Browser pattern

- Use a stable key that contains all context affecting the result (resource, identity, locale or environment). Never cache one user's result under another user's key.
- Use null when reading is disabled. Empty URLs and failing requests are not an off switch.
- Check response.ok, then parse JSON and validate the actual runtime schema. Derive types from that schema. JSON SyntaxError means invalid-json; body transport, cancellation and timeout failures mean network. Preserve HTTP and invalid-data as separate errors.
- Keep loading, data, error and revalidation visible. Data and error can coexist; failed revalidation may retain the last valid data.
- Use explicit typed defaults when no data exists, while preserving the error. A default is not a successful response.
- Choose focus/reconnect, retry and refresh policies deliberately. The sample disables focus refresh and automatic retry, enables reconnect refresh and offers manual refresh. Do not introduce global polling.
- Map finite response values to registered semantic classes or behavior. Never accept arbitrary CSS, class names or JavaScript from settings.
- User-visible labels remain app-owned prepared copy keys. Display bounded errors, not response bodies.
- Keep secrets out of browser payloads, public variables and SWR caches.

The sample's domain hook is intentionally application-owned. Different apps may need different defaults and cache policies. Only extract another shared helper after actual reuse establishes a stable contract.

## Node and SSR

When a real Node consumer exists, centralize fetch/schema/timeout in its application data module and choose an open-source bounded LRU with a finite TTL. Include every relevant input in the cache key, name capacity/TTL constants and distinguish cache misses from request failures. This repository does not install an unused LRU or implement an empty cache.

If a setting must decide SSR output, resolve it on the server and supply initial SWR data under the identical key to avoid hydration differences. Do not leak server credentials or private decisions. The current client example does not add SSR gating or random AB assignment.

## Event tracking is separate

Existing hosts place consumer-owned instances in `src/integrations/event-tracking/`. Plain-next wires its instance in `src/infra/event-tracking/` and takes its options and event types from `src/site/tracking-events.ts`. ET takes explicit event data and reports delivery results; SWR reads domain data. Neither depends on the other. Shared `@frontend/event-tracking` has no SWR or React dependency.

At the application environment boundary, unset or empty tracking URL variables become explicit null configuration. Nonempty URLs still undergo the shared class's HTTP(S) validation; the class itself rejects empty strings.

Root `pnpm test:e2e` isolates tracking for both build and production start: it explicitly blanks NEXT_PUBLIC_EVENT_TRACKING_URL and EVENT_TRACKING_URL, overriding Next .env files and inherited analytics configuration. The configured Web tracking test opts in through TEST_EVENT_TRACKING_URL=https://events.example.test/capture; Playwright intercepts that fixture URL. Do not use an operational analytics URL for this variable.

Official references: [keys](https://swr.vercel.app/docs/arguments), [conditional fetching](https://swr.vercel.app/docs/conditional-fetching), [error handling](https://swr.vercel.app/docs/error-handling), [Next.js](https://swr.vercel.app/docs/with-nextjs).
