# Scoped, read-only application resources

Text, AppConfig and Content share a preparation and rendering model. This is the
default integration in plain-next, not a requirement to use every capability.
A small site normally has one main Text dictionary per language, one app.json
configuration and a small base Content file. Additional namespaces belong where
they are needed. Hosts can replace this integration with another loader or state
system without changing their business documents.

## What belongs in each resource

| Kind      | Data                                                        | Consumer                                        | Changes during a session                           |
| --------- | ----------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| Text      | Flat UI strings and named placeholders, organized by locale | `useText().getText(namespace, key, variables?)` | Append namespaces and coordinate language switches |
| AppConfig | Public application behavior and presentation settings       | `useAppConfig().get(namespace)`                 | Append configuration namespaces                    |
| Content   | Structured records, relationships and content values        | `useContent().get(namespace)`                   | Append content namespaces                          |

User preferences, editor drafts, permissions and server credentials have different
lifecycles and do not belong in these readers. For example, a setting can allow
tracking; a visitor's consent remains separate state. Content resources do not
replace the SQL/document-storage interfaces or impose a storage provider.

## Three ownership boundaries

1. **Preparation owns the source decision.** Tracked defaults plus ignored local
   overrides are validated into ignored generated artifacts. auto merges existing
   overrides, default ignores them, custom requires every declared override.
   Runtime never chooses between source files.
2. **Runtime owns transport and cache.** ResourceRuntimeProvider shares the browser
   loader, request deduplication, cancellation/deadlines and bounded cache. A
   namespace definition supplies its versioned URL and schema. The server uses
   its own injected reader; browser cache state is not a process-global SSR store.
3. **A Provider owns a read scope.** A Boundary (Guardian) prepares missing resources
   and gates the dependent visual subtree. The Provider publishes a validated
   immutable reader. Business components read synchronously and receive no setter.

Resource objects contain validation and reading rules outside React. TextResource
handles language, flat contracts and interpolation; JsonResource handles structured
schema outputs for Config and Content. Keeping these objects separate from
Providers supports server reads, direct tests and another UI/state framework.
Providers supply React lifetime and Context updates, not a second data model.

## Choosing a Provider scope

A **namespace** identifies one registered resource, such as Content `catalog`. A
`ResourceScope` declares which namespaces its children need and gates those
children while they load. Each result goes to the **nearest Provider of its
kind**. The Provider determines who can read it and how long it stays installed.
Its initial declaration lists the namespaces required at startup. Once ready, it
can accept additional registered namespaces.

| When                                                           | What to mount                                             | Who can read the result                                                                                                     |
| -------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| A section opens on demand                                      | A `ResourceScope` around the section                      | All consumers of the existing Provider. The root Layout already supplies one Provider per kind.                             |
| A feature needs its own visibility or lifetime                 | A nested Provider of the relevant kind around the feature | Its descendants inherit the parent reader and gain the local namespaces. Ancestors and other branches keep their own views. |
| A Server Page prepares data its hooks need on the first render | A page Provider with the page snapshot                    | The page subtree can read both Layout and page resources during SSR and hydration.                                          |

A nested Provider overrides **which reader Context returns**. It can own additional
namespaces of the same kind. Redeclaring an ancestor's namespace, or appending
one already claimed by a mounted descendant, raises a collision. Separate sibling
Providers can own the same namespace independently. At one owner, installing the
same artifact with equal JSON is idempotent. A conflicting value is rejected.
Successful additions publish a new immutable reader to that Provider's consumers.

### Why the Next.js example has a page Provider

The page Provider is an App Router workaround for handing off a page-specific SSR
snapshot. Layout can prepare its global resources while Page independently prepares
`catalog`. The Page result travels down through props and cannot initialize the
ancestor Layout Provider. A page Provider composes that snapshot with the Layout
reader on the first render. This keeps page-only data out of other routes, preserves
static generation for eligible routes, and avoids a client round trip for data the
server already loaded. A page using only Layout resources consumes the Layout readers
directly.

## Lazy loading in the current Provider

In `/examples/content`, Layout owns `base` and the page Provider owns `catalog`.
Clicking **Making notes** mounts this gate around the notes section.

```tsx
<ResourceScope scope={RESOURCE_SCOPES.makingNotes}>
  <Notes />
</ResourceScope>
```

The page remains usable while notes load or retry. Once installed, `making-notes`
is readable throughout the page Provider, including outside `<Notes />`. Closing
the section releases its loading gate. Reopening it uses the installed reader.
Unmounting the page Provider ends that ownership. The shared Runtime may still
cache the artifact for another mount.

## Rendering and performance

Prepared snapshots are restored and validated before dependent children first
render. Hydration uses the same data as the server; it does not render placeholders
and then patch resource values in an Effect. Without a snapshot, the Boundary
starts missing loads, shows its explicit pending/failure state, then releases the
complete subtree. Getters never return promises.

All independent required kinds in one scope start before waiting for completion.
Nesting Providers does not put their requests in a Text → Config → Content
waterfall. Each Boundary has its own visual scope: slow optional notes do not
hide the already usable catalog or global navigation.

Definitions include kind/source, namespace, schema version and content revision.
Prepared Config/Content URLs and cache identities are language-independent.
Switching Text language therefore does not refetch those resources. Text changes
prepare the active locale requirements before publishing, preserving the previous
complete view until the target is ready.

Dictionary/content payloads do not enter client JavaScript bundles. Only schema,
key/placeholder contracts and identity metadata participate in planning. Server
loaders use statically analyzable lazy imports of generated assets; browser
fallback uses allowlisted HTTP JSON resources at matching versions. Passing data
to a Client Provider makes it public, even when the source lived outside public/.
Never include secrets.

## Host responsibilities

plain-next declares resource membership once in RESOURCE_SCOPES and derives plans
for server preparation, Provider initialization and optional navigation prefetch.
Text uses a generated flat contract; structured Config/Content use host-owned Zod
schemas. The formal app has one Config namespace; extra Content belongs to its
example page and expandable section.

Extend the schema/defaults and registry/loader mappings together, prepare explicitly,
then run checks. Bump schemaVersion when parsing semantics change; content revisions
are generated from effective data. A static export/CDN may need another delivery
adapter; the example HTTP routes assume a Next server deployment.

See [resource initialization](resource-initialization.md) for APIs and limits,
[AppConfig](app-config.md) for legacy/namespace preparation, and the
[plain-next guide](../packages/templates/plain-next/README.md) for the runnable example.

## Explicit scope gates

ResourceScope takes a required scope. planResourceScope expands exactly its
Text/Config/Content declarations into one plan. ResourceBoundary owns loading,
waiting, deduplication, deadlines, failure and retry for that complete plan. The explicit declaration determines what loads. A Content-only gate uses the ContentProvider
and can run independently of language selection.

Host bindings publish the requested resources to their nearest same-kind Providers.
A cold Provider needs all its startup requirements available before publishing its
first reader. Further scope declarations can then append to that owner. An
independent loader can use the same installation rules through
`useAppendNamespace()` from the host's resource client entry. See
[installing an externally loaded namespace](resource-initialization.md#installing-an-externally-loaded-namespace).

SSR data can be supplied completely or partially. The generic Boundary validates
partial initialResources against exact resource identities and loads missing
entries only. Complete snapshots keep their strict plan/count validation. Prepared
readers render synchronously; CSR waits until loaded results have been published.
Text no longer acts as the control entry point for other resources.

## One preparation path

The host has one scope-to-plan entry for SSR, browser warmup and visible resource
scopes. The Runtime loads that plan, while kind adapters project complete owner
inputs. Providers prepare immutable reader candidates before any candidate is
published. This separates transport validation, domain resource construction and
React publication without a second data repository or cross-scope business setter.

Generated manifests also drive server import maps during preparation. Their
literal imports remain server-owned, and preparation commits the maps with the
JSON artifacts. Input configuration and schemas remain the maintained declarations.

Reader publication is a controlled completion stage of ResourceBoundary. It
reports candidate errors in the same visual region as loading errors, and retries
candidate construction using already downloaded values. Providers still construct
and commit their own readers; the boundary manages readiness, error feedback and
retry. This preserves scope-local state and all-or-nothing candidate publication.
