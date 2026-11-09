# Resource initialization

Use this system when components must synchronously read required JSON/text that
can be prepared by a server or loaded by a browser. Loading is asynchronous;
consumption starts only after the complete required set is valid. The shared
implementation is production code; plain-next is an independent example host.

## Ownership and public entries

| Entry                                 | Responsibility                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| @frontend/resource-runtime            | Pure resource definitions, identity, planning, validation, snapshots and injected-reader preparation |
| @frontend/resource-runtime/http       | Standard fetch reader with byte limits; no application endpoint                                      |
| @frontend/resource-runtime/react      | Scoped SWR cache, atomic ResourceBoundary and controlled navigation preparation                      |
| @frontend/text-catalog/resource       | Generated flat contracts, TextResource and immutable locale-bound views; no I/O                      |
| @frontend/prepared-data/resource      | Pure schema-inferred JsonResource and immutable scoped Config/Content readers                        |
| @frontend/prepared-data/resource/node | Node namespace preparation using existing default/custom/generated transactions                      |
| @frontend/text-catalog/resource/react | Thin typed TextProvider/useText factory; no loading                                                  |
| Host integrations                     | Locale/route selection, actual resource declarations, readers, errors, UI and deployment             |

Existing text-catalog root, /node, /react and generated catalog preparation remain
supported. Namespace source preparation uses workspaceTextResources and text-resources.config.ts; the legacy catalog format remains separate. AppConfig and business content remain independent; generic resource plans
can carry non-text JSON without creating a TextResource.

## Resource declarations

A definition declares id, URL, source, content version, schema version and validateArtifact.
The validator checks the frozen, owned JSON artifact synchronously, throws on
invalid input and returns no value. Move transformations from legacy parse
callbacks to source preparation or a custom reader. Full snapshots, partial
seeds and hydration all preserve the prepared JSON value. Identity includes
all descriptor fields except the function reference.
If artifact semantics change, bump schemaVersion. If content
changes, publish a new immutable version/URL. Do not overwrite an immutable URL
and expect focus/reconnect to refresh it.

```ts
import { createResourcePlan } from '@frontend/resource-runtime';
const plan = createResourcePlan(
  [
    {
      id: 'common',
      url: '/resources/v1/en/common.json',
      source: 'public',
      version: 'v1',
      schemaVersion: '1',
      validateArtifact: validateCommon,
    },
  ],
  { locale: 'en' }
);
```

Host functions can resolve these descriptors from locale/route/version. Use
planResources when a registry/context resolver is useful. Route selection is
not duplicated in readers. createResourcePlan sorts/deduplicates identities and
rejects conflicting definitions or excessive resource counts. Context is opaque
string metadata; locale is a host convention, not mandatory for every resource.

## Host resource scopes

plain-next declares RESOURCE_SCOPES in src/site/resource-scopes.ts.
Each immutable scope contains its id and text/config/content namespace requirements. ResourceScopeDefinition
and ResourceScopeId are derived from this declaration. Layout, metadata and page
examples are scopes; their IDs are independent of URL paths.

```tsx
const snapshots = await prepareScopeResources(RESOURCE_SCOPES.textDemo, locale);
// The browser prefetches exactly the same scope:
await prepare(planResourceScope(RESOURCE_SCOPES.textDemo, locale).plan);

<TextProvider scope={RESOURCE_SCOPES.textDemo} initialSnapshot={snapshots.text}>
  <ResourceScope scope={RESOURCE_SCOPES.textDemo}>{children}</ResourceScope>
</TextProvider>;
```

Provider, server preparation and navigation consume this single declaration;
there are no separate page/namespaces props or implicit demo-scope defaults.
The inferred discriminated union rejects unknown IDs and mismatched requirements.
The scope declaration is a site-owned entry without planner or Text
implementation dependencies. The generic shared resource-runtime remains unaware
of host scope names. Language transitions derive the union of active scope needs.

Text demonstration UI lives beside its routes in
src/app/[locale]/examples/text/_components. SSR and CSR page.tsx remain small route
entries that select server preparation or client-only loading; both share the same
interactive example, navigation and labels.

## Server preparation and props snapshots

```tsx
const snapshots = await prepareScopeResources(RESOURCE_SCOPES.textDemo, locale);
return <TextDemoPage initialSnapshot={snapshots.text} mode="SSR" />;
```

Next integration belongs to the host, never the shared packages. The plain-next
server-only reader maps exact versioned URLs to static-analyzable lazy imports of generated namespace JSON.
This reads deployment assets without self-fetch during build and without cwd
filesystem lookup. The browser reader fetches those same public assets. Keep
URL/version/import mappings consistent; unknown mappings fail explicitly.

prepareResourcePlan validates all required data before returning a protocol-v1
snapshot. It contains only planKey and selected key/value resources, not schemas,
functions, instances, all locales or secrets. Next serializes it as Client
Component props. The browser constructs its own resources synchronously before
rendering children. It never parses custom global window data or waits for an
Effect to install an already prepared dictionary. Concurrent SSR requests never
share a mutable current language or a browser cache.

The snapshot must match the plan exactly. Duplicate, unknown, missing entries,
wrong protocol or invalid data reject. A later new snapshot/plan is processed
without relying on useState initializers rerunning. Never use React key changes
to reset the whole application for a language switch.

## Browser initialization

Place one ResourceRuntimeProvider at the owning Layout with a stable reader.
The provider owns loading and caching; global/page ResourceBoundary instances
choose their own visual gates. Its private SWR scope does not replace ordinary
application SWR caches. Borrowed SWR configurations reuse the effective cache and
mutate but omit provider factories; restoring a scope never invokes a business
provider: () => new Map() again. Use a
ResourceBoundary with plan, optional snapshot, pending, failure and a ready render
function. No snapshot is required: each missing resource loads through its own
SWR key. Complete cached plans can enter the first content render directly.
During later changes, the previously committed value remains visible until the
entire new target is ready. failure receives ResourceError and an explicit retry.

The boundary hands validated `PreparedResources` to the host. For each requested
kind, the nearest Provider publishes an immutable reader containing its startup
and appended namespaces. A nested Provider composes this reader with its parent's.
When a Page supplies its own SSR snapshot, its consumers can read that composition
during their first render and hydration.

Client Components may be pre-rendered. To verify CSR without server content,
plain-next uses next/dynamic with ssr:false inside a Client wrapper. The outer
Next shell can still be pre-rendered/hydrated. The content subtree starts with a
stable initialization UI; after ready, its getters are synchronous. Bootstrap and
HTML preload are optional future optimizations, never correctness dependencies.

## Flat text contracts and synchronous API

Tracked reference-language default JSON defines each namespace's flat string keys
and named placeholders. Preparation derives contracts.json; hosts do not author
schemas, key lists or variable whitelists. Namespace Text preparation fills absent
translation keys from the effective reference locale (English by default).
Set `missingKeys: 'error'` to require complete tracked translations instead.
Generated dictionaries always have the same keys, so SSR and CSR read just the
requested language. Translations may reorder/repeat/omit declared variables.
Custom JSON only overrides values.

```json
{ "home.title": "Welcome.", "greeting": "Hello {name}" }
```

Dots are ordinary characters in a key. Nested objects, arrays and non-string values
reject. Contract/identity metadata is separate from dictionary payloads. TypeScript
gets literal key and variable names from generated object properties.

```ts
const resource = new TextResource(contracts.namespaces, [
  {
    locale: 'en',
    dictionaries: [{ namespace: 'main', dictionary, version }],
  },
]);
const view = resource.createView('en', { required: { main: version } });
const page = new TextResource(contracts.namespaces, [
  {
    locale: 'en',
    dictionaries: [{ namespace: 'demo', dictionary: demoDictionary, version }],
  },
]);
const pageView = page.createView('en', { parent: view, required: { demo: version } });
pageView.getText('main', 'home.title');
pageView.getText('demo', 'greeting', { name: 'Reader' });
```

Install all required namespaces before reading. Without values, getText returns the
raw string immediately, including placeholders. Explicit values request replacement
using fragments compiled at installation. Missing/unknown variables or invalid
values raise TextInterpolationError, with key metadata and no supplied values.
0 and empty strings are valid. Replacements are plain text, never expressions/HTML
or another round of interpolation. Missing namespace/key still returns namespace.key
and calls onMissing; the loader prevents required-resource failures reaching content.

Construction validates the whole input and owns its immutable dictionaries.
hasText checks local namespace/locale/version. createView binds an explicit language,
checks local required versions and optionally composes a parent reader. Different
parent languages and duplicate namespaces reject. Old views keep their captured
entries when a new resource or parent view is published. Explicit language overrides
read only prepared dictionaries and never load more resources.

TextResource has no editing, removal, clear, mutable current-language or direct
getter API. Its independent container/reader contract allows server and non-React
consumers to reuse validation and interpolation. React publishes new reader values.
This is a practical default integration; applications may replace it for their needs.

## Language switches and navigation

The root TextProvider coordinates a switch across all mounted Text Providers. The
target plan includes their startup and appended namespaces, even after a section
that requested one has closed. If a Provider mounts, unmounts or gains a namespace
during a switch, the coordinator replans for the same target. Only the current
attempt can publish or report failure. Obsolete requests may still warm the cache.
Keep the current view while preparing the target locale. Publish only the latest
still-requested complete target, atomically changing text and its lang attribute.
Failure retains the old view. Changing Context updates text consumers without
remounting their note/counter state. No content hot-update API is introduced.

The SSR link navigates directly. Its Server Page prepares the snapshot, so
navigation can succeed even when the browser dictionary endpoint is unavailable.
The CSR link uses usePrepareResources and warms the client module while the
current page is visible. On warmup failure it still navigates. The destination
Boundary owns cold loading, error feedback and retry for both clicks and direct visits.
A later App Router navigation invalidates the pending CSR handoff as soon as the
transition starts. The shared resource request can still populate the cache.
Selecting the current CSR URL leaves the page and its form state in place.
Next route prefetch does not automatically preload arbitrary JSON. The layout-owned
language switch is client-owned; changing Server Component content would require
requesting new server output. Initial locale follows URL input; the example does
not implement language cookies, Accept-Language routing or persistence.

## Limits, cancellation and cache lifetime

Defaults are centralized and overrideable at their owning APIs: 10-second complete
request deadline including queue wait, six active reads, 1024 queued reads, 512
resources per plan, 256 KiB per HTTP resource, 64 inactive cached records and 32
prepared languages per TextResource. A plan or queue capacity failure is explicit.
Streaming response bodies count bytes before JSON parsing. Timeout covers stalled
headers/body, not just initial fetch resolution.

SWR owns decoded network results and per-key request sharing. TextResource owns
local validated dictionaries and view rules; scoped readers retain immutable text entries. The fetcher's temporary pending map also deduplicates
imperative navigation with mounted consumers and deletes entries on settlement;
it is not a second persistent cache. ResourceCache pins mounted consumers and
trims inactive records by LRU after a microtask. No data cache lives globally.

Unmounting a consumer releases its pin, leaving other consumers' requests intact.
True provider unmount disposes active/queued work. Microtask-delayed disposal
survives Strict Mode cleanup/setup. A standalone fetcher owner calls dispose().
The provider's lifetime releases its cache. User-selected versions/sources must
produce different identities. Persisted storage and server cross-request caches
are not supplied. The cache capacity is selected on provider creation; create a
new explicit scope when changing the cache policy/source isolation boundary.

ResourceError kinds distinguish definition/snapshot, HTTP, network, timeout,
aborted, invalid JSON/data, too-large and capacity. Error causes preserve technical
information; the host chooses user-facing text. No failure becomes an empty
successful dictionary, and no request remains pending forever after its deadline.
Parsers must not block the JavaScript thread; deadlines bound asynchronous I/O,
not arbitrary synchronous user code.

## Extension and verification

Add locale/namespace assets and schemas, update the host plan/reader mapping and
bump content/schema versions as appropriate. Shared core changes are unnecessary.
Use a different ResourceReader for another origin/transport; supply URL resolvers
for base paths/CDNs. Do not move personal source selection into a getter. Existing
prepared default/custom pipelines may later publish this protocol, but this
example does not invent a parallel profile system.

The plain-next package README and /examples/text demonstrate actual integration.
Production Chromium checks cover SSR HTML without JS, no duplicate hydration
requests, true CSR gating, language/state preservation, retries/timeouts, stale
completion, navigation and dictionary exclusion from static client JS chunks.
Shared tests cover contracts and resource/React lifetimes. Public template clone
verification runs the same implementation under renamed scope/app and independent
install/build/dev/production. Use normal parameterized workspace commands; no
engineering references file is required to build or run the product.

## Default/custom preparation before runtime loading

Namespace hosts declare workspaceTextResources, text-resources.config.ts and the
@frontend/text-catalog/resource/node preparation entry. Defaults are
content/default/text/<locale>/<namespace>.json; optional overrides are ignored
.local/content/text/<locale>/<namespace>.json. Explicit app:prepare/text:prepare
uses the existing prepared-data transaction, safe merge and auto/default/custom
source policy. Strict custom requires all declared files. Invalid defaults,
overrides, unknown keys and interpolation variables reject without replacing
previous valid output. Existing .local files are never rewritten.

Outputs under .generated/text include a canonical catalog, generated contracts.json,
independent namespace JSON and resources.json. Only key/variable/identity metadata enters the planner bundle;
dictionaries are lazy server imports or HTTP responses. A SHA-256 revision of final
content automatically changes resource URLs/cache identities. Contract protocol/revision also participate in validation identity, so stale nested/key/variable contracts cannot match. SSR and HTTP read
the same generated files; HTTP exposes only registered namespace/version combinations, never canonical
catalogs, manifests or source files. Config is public only through its registered JSON route.

Dev/build/typecheck/test run app:check. Source changes, optional override additions
or removals, schema failures, missing/edited/extra generated files and concurrent
replacement are checked. Preparation removes obsolete files through the same
rollback-protected directory replacement. Check never silently prepares. Clone,
bootstrap and CI recognize this capability and prepare before validation.

AppConfig opts into namespace preparation with {version, resources} in config.config.ts.
plain-next consumes app through its AppConfigProvider and useAppConfig().get('app').
Existing hosts can also declare a single AppConfig schema with {version, schema}.
Content declares workspaceContentResources and content-resources.config.ts; the root
preparer supplies kind=content and prepares all declared namespace files. Sources
are content/default/data/<namespace>.json and .local/content/data/<namespace>.json.
Both structured kinds emit prepared.json, resources.json, namespace JSON and the
freshness manifest under their own .generated directory. Artifact names prepared,
resources and manifest are reserved namespaces.

## Complete template text composition and rendering policy

plain-next uses main for all owned UI/metadata and demo for independent sample
content. Layout prepares main; a page with extra content prepares only demo.
Both server route segments can start independently. Each snapshot travels down
through serializable props to the scope that reads it.

```text
Root Layout
  ResourceRuntimeProvider        shared network/cache/request lifetime
    TextProvider                 main container + reader; language coordination
      ResourceScope              global plan + reader publication
        ResourceBoundary         global visual Guardian
          ordinary consumers
          TextProvider           page demo container + inherited parent reader
            ResourceScope        page plan + reader publication
              ResourceBoundary   page visual Guardian
                useText consumers read main + demo through one hook
```

This page Provider is a Next.js App Router workaround for SSR snapshot handoff.
Layout and Page can fetch independently, and each passes its own snapshot down
through props. A Page cannot supply new initial props to the Layout's Provider.
The page Provider makes `demo` available on first render while other routes load
only `main`. For a browser-only addition, a section can mount just a
`ResourceScope` and use the Provider it already has. Add a nested Provider when
the subtree should own the extra namespaces and release them at unmount.

Prepared snapshots are restored against the exact plan and converted to local
resources before publication. Later props or completed requests build new candidate
resources; stale completions after a changed target or unmount cannot publish.
No consumer-facing dictionary setter or cross-scope mutation exists.

The Runtime belongs to the React tree, not the process. Server resources are
request-local; browser Runtime cache survives client navigation. Readiness checks
use the local plan and composed reader. Resource existence alone is not readiness.

The host resolves one initial locale before rendering. plain-next uses the
app/[locale] Root Layout and a narrow Proxy rewrite: existing URLs such as
/examples/text/ssr?lang=zh map internally to /zh/examples/text/ssr. Layout,
metadata, html lang, global main snapshot and page snapshots use that same route
parameter. Unsupported/duplicate/conflicting locale inputs reject. Asset,
versioned-resource and API paths bypass localization. Locale-preserving links
keep the existing public URL shape.

The root TextProvider receives initialLocale and initializes its committed language
synchronously. Nested providers inherit it and own only local prepared text. ResourceScope inherits that selection;
it has no independent initialLocale prop. Snapshots validate against the owner's
server origin locale before use and cannot overwrite a later client selection.
No effect changes an English first render to the requested language. Language
selection prepares all active scopes before committing; the document lang follows
the committed global view. The /examples/text layout has a visible shared main
consumer outside the page gate, so nondefault entry tests verify the actual shell
and page together, with JavaScript disabled and during hydration.

The routing follows Next's [locale segment guidance](https://nextjs.org/docs/app/guides/internationalization)
and [Proxy rewrite contract](https://nextjs.org/docs/app/api-reference/file-conventions/proxy).
This is host-specific Next wiring, not a dependency of either shared package.

A scope initializes complete snapshots synchronously. Without one, its Guardian
fills missing resources through the same runtime. Language changes prepare all
active requirements, validate every scope's immutable candidate before staging any,
then commit the shared locale. Every scope reads its staged target during that render; cache
eviction cannot split the language transition. In the SSR example the page Provider owns its dictionary. Failure retains the previous views; stale completions cannot publish.
Ordinary business SWR remains outside the resource cache's eviction policy.

A small set of offline startup and fatal-page messages remains independent of
dictionary loading. They explain failure even when Text cannot initialize.
Normal labels, option names, page-status text, navigation and metadata use getters.
The source checker applies its UI-text guard to namespace hosts too.

Do not add force-dynamic to a shared Root Layout just to await resources. Static
prerendering can await the same preparation and serialize snapshots. The template
uses generateStaticParams for supported locale variants of ordinary pages/index.
The SSR/CSR scenario pages call connection() to stay request-rendered without
disabling root prerendering. Per-request personalization or mutable
server data can opt in at their own route. This controls server rendering/cache,
not the browser's SWR storage. Prerendered theme policy reflects the build-time
UI_THEME_POLICY value; keep build/start values consistent.

## Preparation-safe integration and module boundaries

Plain-next declares source locales, namespaces and versions in src/site/text.ts.
text-resources.config.ts imports this entry through an explicit Node-resolvable .ts path and
can prepare before .generated exists. Runtime planning consumes the generated
contract/identity metadata afterward; preparation never imports that runtime.

src/infra/resources is the host resource composition, with pure index.ts,
client.ts and server.ts APIs. planning resolves site-declared page requirements, components own
Layout/boundary composition, and services own Next server preparation. Site-owned metadata selects its fields in src/site/metadata.ts.
Its text child exposes its own pure/client/server/preparation APIs, generated
namespace descriptors, scoped resource construction, readers and language coordination.
The child does not depend on parent route plans. Shared package resource state
machines stay in resource-runtime. The json responsibility folder owns structured
Config/Content registry, immutable reader Providers and server delivery.

Example navigation remains with example UI and uses the shared resource cache.
Ordinary data/event features consume the outer resource public APIs.

Adding a key/placeholder means editing reference defaults, matching translations,
and running text:prepare; generated contract/types update automatically. Do not edit
contracts.json. If existing private overrides use obsolete namespaces, review their
mapping before migration instead of rewriting or silently ignoring private sources.

## Structured Config and Content

Config and Content follow the same [Provider ownership rules](#resource-scope-composition) as Text.
JsonResource from @frontend/prepared-data/resource validates, owns and
freezes schema-derived values. createView(parent?) adds disjoint namespaces; get
returns deeply readonly output, has checks a prepared namespace/version. There
are no business setters. Schema parsing must return safe finite JSON.

planResourceScope(scope, locale?) is the host's single planner for server
preparation, browser warmup and ResourceScope. Internal kind planners produce
subplans from the same declaration. prepareScopeResources(scope, locale?) loads
the complete plan concurrently and projects per-kind snapshots. Root Layout passes
the returned initialSnapshots directly to ResourceLayout. The complete set
restores synchronously. Without snapshots, ResourceScope starts missing Text,
Config and Content before waiting; nested Providers do not serially start fetches.

The server registry maps exact URLs to generated lazy imports. The public route is
/resources/json/<config|content>/<revision>/<namespace>.json. Unknown kinds, names,
versions, extensionless requests and internal preparation artifacts return 404.
Each namespace has its own content revision and schema version. Neither participates
in locale selection. JSON payloads are not statically imported into client modules.

The Content example prepares the locale-independent `catalog` and the selected
locale's `demo` dictionary together. Each page Provider receives its own snapshot
and inherits the Layout reader. Inside the page, `useContent().get('catalog')`
exposes the original JSON. Pass the active Text reader to resolve explicit
`$text` fields for display:

```tsx
const scope = RESOURCE_SCOPES.contentDemo;
const snapshots = await prepareScopeResources(scope, locale);
// Render the scoped providers with the prepared page snapshots.
<TextProvider scope={scope} initialSnapshot={snapshots.text}>
  <ContentProvider scope={scope} initialSnapshot={snapshots.content}>
    <ResourceScope scope={scope}>
      <Catalog />
    </ResourceScope>
  </ContentProvider>
</TextProvider>;

// Inside Catalog:
const text = useText();
const works = useContent().getResolved('catalog', { text }).works;
```

Clicking **Making notes** mounts a `ResourceScope` inside the page Provider.
Only the section waits or retries. Once the load succeeds, the page reader includes
`making-notes` alongside local `catalog` and inherited `base`. Closing the
section leaves the installed namespace available until the page Provider unmounts.

Cross-kind preparation validation receives validate(text, config, content) in
app-inputs.config.ts; older two-argument hooks remain valid. Namespaced structured
artifacts expose values and manifest, unlike a legacy direct config object. The
existing generation-basis check and app lock cover every participating kind.

## Conversion belongs to source preparation

Structured namespace definitions may provide sourceSchema for raw JSON conversion;
schema describes the resulting artifact. Only preparation uses sourceSchema.
Runtime definitions and JsonResource call validateJsonArtifact with the artifact
schema. Repeated load/create/restore/SSR/HTTP validation must preserve JSON values,
not apply transformations again. Validation rejects changes to a prepared value.
See the [prepared-data contract](../packages/shared/prepared-data/README.md#source-conversion-and-artifact-validation).

Source workspace policy checks declarations and lifecycle commands without
executing application TypeScript. It does not assume config/default/app.json or a
Content directory for declaration-owned paths. app:prepare/check load the actual
format adapter and verify every declared default/custom input. The legacy Config
adapter still requires its original app.json path; namespaced Config may use other
paths and omit app entirely. Missing/unsafe inputs fail preparation or check.

## Resource scope composition

ResourceScope is the host composition component. It resolves scope requirements
into a plan and connects the prepared results to the matching Provider readers.
Its nested ResourceBoundary owns the Guardian behavior for loading, waiting,
failure and retry. ResourceScopeDefinition names the immutable input declaration.

ResourceScope requires scope={RESOURCE_SCOPES.<owner>}. The pure
planResourceScope(scope, locale?) creates one multi-kind plan; locale is required
only when the scope requests Text. Layout and Page prepare independent scopes;
ordinary pages consume the Layout scope without a redundant local declaration.

The host's scope-bindings adapter projects snapshots and prepares publications for
requested kinds only. ResourceScope delegates every actual request and
retry to the shared ResourceBoundary. It has no Text-specific children API; Text
UI reads useTextLocale() itself. useEnsureJsonScope and its separate loading loop
are removed. Content-only scopes can load without any TextProvider.

Startup requirements come from the Provider's declaration. Later gates can append
registered namespaces to the nearest Provider of each requested kind. The bindings
stage every required reader before publishing any of them. Consumers elsewhere
under that Provider can then read the addition. A nested Provider inherits its
parent's reader and owns its additions locally.

ResourceBoundary accepts initialResources for validated partial seeds, mutually
exclusive with initialSnapshot. restoreResourceEntries validates each seed against
the plan, rejecting duplicates, unknown identities and invalid data. It does not
relax restoreResourceSnapshot's complete-plan contract. Already successful/seeded
resources stay cached when another resource fails; retry targets failed/missing
entries. SSR hydration and partial CSR initialization do not refetch supplied data.

## Installing an externally loaded namespace

Use `ResourceScope` for the usual lazy section. If a Client Component already
obtained a prepared JSON value through SWR or another loader, call
`useAppendNamespace()` from `@/infra/resources/client` to get the
installer. Call it in the loader's success handler or an effect.

```ts
const append = useAppendNamespace();
const onNotesLoaded = (value: unknown) =>
  append({ kind: 'content', namespace: 'making-notes', value });
```

`kind` selects the nearest Text, AppConfig or Content Provider (`'text'`,
`'config'` or `'content'`). For Text also pass the artifact's `locale`, matching
the Provider's selected language. The hook validates the artifact against its
registered contract. Reinstalling equal data for the same identity is a no-op.
A different value for an installed namespace raises an error. With this imperative
API the caller handles loading and errors. With `ResourceScope` the Boundary
supplies pending, failure and retry UI.

## Generated server import maps

Text, Config and Content namespace preparation emits server-imports.ts from the
prepared manifest beside its JSON artifacts. Literal relative imports let Next
trace every resource without putting dictionary/content payloads in client
JavaScript. Format-owned descriptors bind those generated paths to versioned HTTP
URLs. SSR and the HTTP endpoints share those bindings, so adding a language or
namespace never requires a second hand-maintained server list.

Modules participate in the preparation lock, atomic replacement, hashes and
inventory checks. A failed preparation preserves the previous complete output;
removed namespaces disappear from the next map and output directory. auto/default/
custom keep their existing source semantics. Prepare explicitly before dev/build.

## Internal resource publication

Transport snapshots are restored at the external props boundary. Runtime loading
also validates artifacts. Inside host composition, ResourcePublisher exchanges
PreparedResources directly without serializing and restoring intermediate
snapshots. The scope projects the requested entries by kind. Each owner merges them with its
installed entries and prepares a candidate for publication.
Only after every candidate is valid are their commit callbacks invoked.

Each JSON publication builds one local JsonResource candidate. The candidate contains the
composed parent/local reader and publication reuses that actual reader. If only
the parent reader changes, the local resource is retained and its view is
recomposed. Old readers stay immutable; a commit captured for an earlier target or
unmounted owner cannot publish. Standalone JsonResource still validates its own
inputs; there is no skip-validation mode.

ResourceBoundary owns the standard scope's cache pins and seed publication.
Providers hold their immutable local resource and do not reseed the same cache.
An integration that displays a Provider outside a ResourceScope may explicitly use
useRetainResources when it needs Runtime cache retention. Business consumers only
receive synchronous read views.

## Publication failure and retry

ResourceScope supplies its readiness and publish callback to ResourceBoundary's
optional publication stage. Downloaded data is not sufficient to release a cold
visual region: every required reader must be published. Already-restored readers
can render synchronously in SSR and hydration.

A candidate-construction exception stays inside this boundary as invalid-data,
preserving its cause. No owner commits until all candidates are valid. The local
failure UI supplies Retry, which invokes publication again against the retained
complete result. Successful downloads are not fetched again. Surrounding regions
remain mounted and usable. Correct a declaration collision before retrying its
reader construction.

planResourceScope is the host's public planning entry. Per-kind jsonPlan remains
inside the resource implementation; external test helpers also use the public
scope plan to select their required parts.

## Resource errors and Next page errors

`ResourceBoundary` owns failures in its client loading, validation and publication
transaction. A region can retry without discarding unrelated global readers.
Expected BFF/form failures remain in their business components.

The plain-next host separately uses Next's route conventions: localized
`[locale]/not-found.tsx` handles absent pages; `[locale]/error.tsx` retries a failed
page segment. Both consume the already-ready global `main` dictionary. Failures
in the root Layout, Provider or server preparation reach `app/global-error.tsx`,
which supplies its own HTML, default styles and synchronous English text from
`src/site/startup-text.ts`. It neither consumes Providers nor fetches dictionaries.
Reload retries the whole root initialization. Home is a native link. UI diagnostics
contain only a safe Next digest, never the raw thrown value.

These are host composition decisions, not resource-runtime error categories.
The dynamic locale root's custom 404 and global fallback are reconstructed by
the installed Next client runtime and require JavaScript. This leaves normal
SSR/SSG unchanged. Direct unknown-page requests return 404; streamed errors may
retain an already-sent 200 response. Production verification uses disposable
clone-only fault injection to test these Next behaviors and recovery paths.
