# Cloudflare adapter

D1 and R2 implement the neutral @frontend/storage ports. This package owns only provider adaptation and lifecycle, with no domain queries, document store, resource identity or environment selection.

The default entry exports createD1Database, createR2Storage and createCloudflareStorage for native bindings supplied by a Worker host. It imports no Node development bridge. The /local entry explicitly opens Wrangler getPlatformProxy and returns a StorageConnection; the caller supplies an absolute config path and remoteBindings flag, and owns close/dispose. It is for local Node servers, never production Workers/browser graphs.

Consumers choose providers and inject storage ports into their domain services. Adapter tests stay with this package.

## Email and human verification

The independent `/email` entry implements `@frontend/email` with the Cloudflare
Email Sending REST API. Applications inject account ID and API token explicitly;
imports never read environment variables or make network requests. Only supported
plain-text fields are serialized; `replyTo` maps to the REST API's `reply_to`.
The adapter confirms the requested recipient is delivered/queued and rejects
bounced, suppressed, absent or unacknowledged recipients even on HTTP 200.

The `/turnstile` entry validates single-use Turnstile proofs via Siteverify and
requires the expected hostname and action. Both entries bound complete fetch/body
deadlines, response size and cancellation. Public error objects expose only safe
codes/status; applications own logging and must not serialize exception causes.
These entries import no Wrangler or Node bridge. Apps own credentials, identity,
fixed recipients, public widget integration and rate/abuse policy.

## Project-pinned CLI

The adapter also exposes a `wrangler` executable to consuming workspaces. It
forwards arguments and standard streams to the pinned Wrangler dependency, using
Wrangler's publicly exported package manifest to resolve the executable. This
keeps supplier tooling owned by the adapter while letting app deployment tools
invoke the standard CLI after a clean pnpm install. No CLI or credential discovery
runs when importing the native D1/R2 entry.
