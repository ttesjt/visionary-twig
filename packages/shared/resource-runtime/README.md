# Resource runtime

Portable resource planning, validated JSON snapshots and React initialization.
The pure root knows no Next.js, application data, React, locale or provider SDK.

Create a ResourceDefinition with id, URL, source, content/schema versions and a
synchronous validateArtifact function. It receives frozen JSON, throws on an invalid
artifact, and returns no value. Convert source inputs in preparation or a custom
reader before handing their artifacts to Runtime. Snapshot creation, restoration
and partial seeds preserve the same JSON value. createResourcePlan creates a deterministic, deduplicated plan;
planResources also resolves a host-owned registry against any typed context.
Resource identity includes all those descriptor fields. Reusing an immutable URL
for changed content is unsupported: bump the version and URL when publishing.

prepareResourcePlan(plan, reader) concurrently reads and validates each required
resource, then returns a versioned JSON snapshot. Readers are injected; server
readers can use deployment-local imports. No server global instance is created.
The HTTP entry exports createHttpResourceReader for browser/standard fetch.
HTTP failures, invalid JSON/data, size limits, timeout and cancellation remain
separate ResourceError kinds. Timeout covers body reading, even a reader that
ignores cancellation. Defaults: 10 seconds including queue wait, six active reads, 1024 queued reads, 512 resources per
plan, 256 KiB per HTTP resource; the owning API exposes overrides.

The React entry provides ResourceRuntimeProvider (reader and cache lifetime) and
ResourceBoundary (plan, optional initialSnapshot, pending, failure, children).
Use one stable provider at the owning layout lifetime; global and nested page
boundaries consume that same runtime. The provider does not gate visuals itself. Initial snapshots restore before
children render. Later plans retain the committed view until all new resources
are ready. A failed switch retains content; failure receives an explicit retry.
Only the latest committed target may publish. Text/services belong in children,
not in the generic planner. No consumer should wait inside its string getter.

Each resource has its own SWR immutable key. Mounting another consumer reuses the
request; unmounting one never aborts another. Request concurrency is provider-owned.
The cache pins mounted consumers and retains at most 64 inactive records by LRU;
active records are bounded by the host's plan size. Each provider's cache is
released with its lifetime, not stored globally. Supply inactiveCacheEntries to
choose a different bound. Cached JSON is validated and frozen. No persistent
storage, automatic mutable-resource refresh or cross-request server cache exists.

Use immutable source/version/schema identities. Pass a new plan for a change in
source, language or content. Snapshots must match the exact plan and protocol;
unknown, duplicate and missing entries reject. ResourceBoundary expects a full
initial snapshot; partial browser caches are filled naturally by individual SWR
requests. Do not pass a snapshot for a different plan.

The React provider owns a private resource SWR scope using public fallback and
mutation APIs. Ordinary useSWR descendants keep their enclosing application cache
and configuration. Borrowed configurations retain the existing cache/mutate and
omit provider factories, so provider: () => new Map() executes only in its owning
SWRConfig; inner scopes cannot silently fork the business cache. Resource requests, retries and usePrepareResources explicitly
use the resource scope; mounting it at the root never puts business queries under
ResourceCache eviction. Complete cached target plans restore synchronously, so a
host can commit one locale across nested boundaries in the same React render.

The React provider uses public SWR fallback/mutation APIs. Host UI owns loading,
errors and navigation. Server/client components exchange the JSON snapshot as
props; no custom global hydration script is needed. Client-only rendering is a
host concern. See the plain-next template for an independent Next integration.

Run the package test/typecheck scripts after building prepared-data. All exports
are public package APIs; /react retains its client directive in dist.

For controlled navigation, usePrepareResources() prepares a plan into the same
scoped cache using public SWR mutation APIs. Its pending-only deduplication is
shared with mounted consumers; it is not another long-lived data cache. A fully
cached plan can render immediately on a new boundary without a loading frame.

createResourceFetcher exposes dispose() for explicit owners. React providers
cancel active/queued work after real unmount; microtask-delayed disposal protects
React Strict Mode's simulated effect cleanup/setup. Removing one request consumer
only releases its pin; it does not cancel the provider's shared operation. Queue
capacity is configurable with maxPendingResources. Cache trimming is deferred to
a microtask so one commit's temporary pin changes do not evict active records.

useCachedResources(plan) reads a complete validated plan synchronously from the
runtime cache without fetching. It is not a subscription: use it when the host
already coordinates renders after preparation, and publish ordinary asynchronous
completions explicitly. It returns undefined for missing identities; it does not
treat an incomplete plan as ready. Cache entries remain subject to eviction.
Owners coordinating an atomic multi-scope transition must retain the prepared
candidate until publication, rather than assuming every target stays in the cache.

## Host-owned scoped snapshots

useRetainResources(plan, snapshot?) from /react validates optional prepared props,
pins the mounted plan's entries and seeds their data into the private Runtime cache
after commit. It performs no fetching and does not gate UI: the host must restore
its reader synchronously and prepare any missing resources. Unmount releases the
pins so ordinary inactive LRU limits apply. Use it for read scopes outside the
standard ResourceBoundary, which already manages these lifetimes itself.

## Partial initialization seeds

ResourceBoundary can receive initialResources (readonly PreparedResource entries)
instead of a complete initialSnapshot. restoreResourceEntries validates these
against the target plan. Missing resources still load in parallel; supplied values
seed the same private cache and never require a redundant hydration request.
Unknown/duplicate identities and invalid data reject. Do not provide both inputs.
Complete snapshot restoration continues to require the exact plan and resource set.
Retry keeps successful cached entries and revalidates only missing/failed entries.

Domain Providers are not dependencies of this primitive. Host wrappers such as
plain-next's ResourceScope map explicit scopes to plans and adapt completed
results into their own readers. Text, Config and Content remain host concerns.

## Host reader publication

ResourceBoundary accepts optional publication={ready, publish}. ready states
whether the host already has usable readers, including restored SSR readers.
Once a complete current plan is downloaded, the boundary invokes publish in an
effect. The host validates every candidate before committing its owners. Ready
SSR children still render synchronously; no publication runs during server render.

Publication exceptions become local ResourceError failures with the original
cause. Retry reruns publication with the retained complete result and does not
revalidate or redownload those artifacts. A late transport-ready notification
cannot clear that failure. Download failures retain their existing missing/failed
request retry policy. The ordinary failure callback owns feedback for both phases.
