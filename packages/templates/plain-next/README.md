# Plain Next.js starter

For the takeover guide delivered to a generated app, see [Your Next.js site](template/README.md). It covers editing the homepage, adding a route, preparing content and removing the examples. Template upgrades can target `src/infra/`; site declarations live in `src/site/`.

A Next.js App Router starter with prepared Text, AppConfig and Content resources.
The root prepares main Text, app configuration and base Content together. Local
scopes demonstrate page-specific text and content without upward mutation.

From the workspace root:

```sh
pnpm dev --app template-plain-next
pnpm build --app template-plain-next
pnpm test:e2e --app template-plain-next
```

The source workspace uses port 3203 for development and 3223 for browser tests.
Root runners build shared dependencies first. After installation run
`pnpm app:prepare --app template-plain-next` explicitly. Dev/build/typecheck/test
check generated inputs and reject missing, changed or stale output. The root Layout uses Next automatic rendering; default pages can be prerendered,
while SSR/CSR scenario pages stay request-aware through connection().

The starter ships a tracked `.env.example`; see [Environment variables](template/README.md#environment-variables) for app-local setup and deployment. The site declares server schemas; the server-only infrastructure validates values on use and reports field names without secret values.

## Metadata

Configure the switch and source mappings in `src/site/metadata.ts`. The default source
uses the existing prepared Text/AppConfig and optional `SITE_URL`. Infrastructure
accepts resolved values; it reserves no namespace or key. Root Layout supplies common
metadata, while the homepage explicitly declares its path for canonical/language links.
See [Metadata](../../../docs/common/metadata.md) for fields, validation, disabling, deployment
and page overrides, or the generated-app [takeover guide](template/README.md#metadata).

Retained capabilities:

- Native HTML on the homepage and ordinary examples. In /examples/layout, Row and Column demonstrate spacing and wrapping with the shared layout styles.
- At `/examples/api`, submit a page title to the same-origin `POST /api/examples/slug` Route Handler. The server validates the JSON and returns a Unicode slug. The slug endpoint runs without credentials or storage. A second form demonstrates a private server key and a real local mock dependency. See the takeover guide for setup.
- Persistent theme selection through a host-owned next-themes adapter. Preferences
  survive reloads, follow the system and synchronize across tabs. The early script
  restores the root attribute before hydration. UI_THEME_POLICY still accepts
  selectable, light or dark; see [Theme preferences](template/README.md#theme-preferences).
- SWR data reading at /examples/remote-settings: validated sample JSON, request
  deduplication, refresh and failure states. This is not an AppConfig provider.
- The event-tracking example uses the site's single browser tracker. Its prepared
  AppConfig switch defaults to off. The root Layout applies the switch together
  with the site's permission hook. See [Enabling tracking](template/README.md#enabling-tracking)
  for the endpoint and consent setup.
- Localized 404 and page-error recovery through Next's standard route conventions.
  A root failure uses an independent English fallback without resource Providers
  or dictionary requests. See [Page errors and recovery](template/README.md#page-errors-and-recovery).
- Shared TypeScript, lint, Vitest, Playwright and root development tooling.

Home, metadata, theme and both original examples read namespace text through
synchronous getters. Metadata is prepared on the server; Root Layout restores the global main snapshot synchronously and ordinary pages
consume their scoped Text readers. Resource loading keeps business SWR unchanged.
The homepage consumes its prepared app setting and base Content; it does not
request remote sample settings or send events. Examples are separate routes.

Generate an independent workspace through:

```sh
pnpm repo:clone --output ../plain-project --template plain-next
pnpm template:clone --target ../plain-project --name another-web --template plain-next
```

The default app is apps/web. Use repo:clone --app-name <name> to rename it;
template:clone always requires --name and appends `apps/<name>` to an existing
generated workspace. Generation assigns unused ports; inspect the app's
package.json workspaceApp and startup output for its actual ports. See the
[template contract](../README.md) and [generation protocol](../../../docs/template-repository/generation.md).

The BFF dependency example has a two-second deadline and bounded JSON responses.
Its production browser tests start isolated servers and inspect both build-time
and runtime test secrets. The test hook supplies fictional, unreachable upstream
settings to keep personal env-file configurations out of the test run.

## Flat prepared Text

Every language owns only main.json and demo.json under content/default/text/<locale>.
main contains all regular UI/metadata; demo contains independent example content.
The existing SSR/CSR Text pages consume main + demo, while ordinary pages/index
load only main. All dictionary values are strings; home.title is one literal key.

```ts
text.getText('main', 'home.title');
text.getText('demo', 'greeting', { name: 'Reader' });
```

No variables means the raw string, with no interpolation work. Explicit variables
use precompiled named placeholders. Missing/unknown/invalid variables report a
TextInterpolationError; 0/empty strings work. Locale overrides are fourth-argument
options. Context consumers use a synchronous bound view, never await a getter.

Set `referenceLocale` (default `en`) and `missingKeys` in `text-resources.config.ts`.
The tracked reference dictionary defines the keys and variables. With the default
`'inherit-reference'` policy, each key uses the locale's selected custom override,
then its tracked translation, then the reference locale's prepared value.
Prepare prints the inherited keys. Use `'error'` to require complete tracked
translations. Every declared locale/namespace needs a tracked JSON file; `{}`
inherits the whole namespace under the default policy.
Unknown keys/variables or nested data fail before any generated output is replaced.
Personal overrides are never rewritten; map obsolete namespaces explicitly before
adopting a changed resource pool.

Run app:prepare/text:prepare explicitly. .generated/text contains the canonical
record, contracts.json, per-namespace JSON, resources.json and source/output manifest.
The contract maps generate TypeScript key/variable types without a second authored
list. Contract and content revisions identify caches/snapshots. All artifacts commit
atomically through the existing engine; check rejects stale/modified/missing/extra
files and never prepares. Preparation source configuration imports no generated data.

src/infra/resources exposes pure/client/server composition APIs. Route
requirements and Next preparation live at this resource scope; its text child owns
dictionary descriptors, pure snapshot views, scoped Text ownership and read contexts.
text/configuration.ts is preparation-safe and imports no generated data. Shared
Text/resource packages have no Next dependency.

Open /examples/text for SSR and actual client-only examples with the same consumers.
Root Layout mounts ResourceLayout: one ResourceRuntimeProvider, a TextProvider
for main and a ResourceScope that delegates its visual gate to ResourceBoundary. Ordinary pages/index consume its reader directly.

The SSR example passes its page snapshot to a local Provider.

```tsx
<TextProvider scope={RESOURCE_SCOPES.textDemo} initialSnapshot={initialSnapshot}>
  <ResourceScope scope={RESOURCE_SCOPES.textDemo}>{/* synchronous page consumers */}</ResourceScope>
</TextProvider>
```

This page Provider is a workaround for Next.js App Router SSR. Layout prepares
`main` while Page prepares `demo`. Each passes its snapshot down through props.
The page's `useText()` consumers therefore see both dictionaries at first render
without waiting for a browser effect to write back to Layout. Use a page Provider
when the page prepares its own snapshot or needs an independent resource lifetime.

Language switching prepares the namespaces held by all mounted Text Providers, including lazy additions, before
one commit, preserving note/counter state. Failure retains current views and offers
retry. Pure CSR works without snapshots; page CSR can reuse the layout's main
snapshot and request only demo. All getters remain synchronous.

Root Layout under app/[locale] owns the initial language. Proxy maps existing
public paths, including ?lang=zh, to the matching internal locale segment before
rendering. HTML, metadata, Layout and page snapshots therefore start in the same
language. TextProvider initializes that locale synchronously; ResourceScope
inherits it and cannot choose a separate initialLocale. No language is patched in
after an English first render. Locale-preserving links retain the public URL shape.

The /examples/text layout displays a main greeting outside the page boundary.
SSR/CSR examples add demo.json in their own boundary, demonstrating both shared
and page-specific resources. Tests observe both regions and html lang together.
ResourceLayout accepts an injected reader and optional snapshot for independent CSR.
Resource SWR is private; ordinary business SWR reuses its existing cache/mutate
without calling its provider factory again.

Runtime reads only prepared artifacts: server-only fixed lazy imports and an
allowlisted versioned HTTP resource route. Dictionary bodies are absent from client
JS. Only generated key/variable/identity metadata is imported by planning. Default,
.local and .generated directories need not exist beside an already-built deployment.
HTTP exposes only registered resource payloads, never contracts/manifests/source files.

AppConfig prepares/checks .generated/config/app.json and the root publishes its
immutable reader. home.showIntroduction controls the existing introductory paragraph.
Event and remote-settings behavior is retained. Offline startup diagnostics remain
independent of dictionaries so initialization errors can be explained.

Supported language variants of ordinary pages/index prerender through
generateStaticParams. SSR/CSR scenario pages use connection() for request rendering. Set UI_THEME_POLICY consistently for build and
start. Resource loading does not require a blanket force-dynamic setting.

See [resource initialization](../../../docs/common/resource-initialization.md) and the
[text package](../../shared/text-catalog/README.md) for contracts, errors and limits.

## Text example placement

The Text examples live next to their routes under src/app/[locale]/examples/text/.
Shared client UI, navigation and the CSR entry live in _components/. The SSR
page.tsx prepares its snapshot; the CSR page.tsx enters the client-only example.
Both use the same UI to demonstrate identical consumption under different loading modes.

## Declared resource scopes

src/site/resource-scopes.ts is the single host declaration for scope IDs
and their Text, Config and Content requirements. ResourceScopeDefinition and ResourceScopeId are derived from
RESOURCE_SCOPES; do not maintain separate string unions or pass page/namespaces
independently.

```tsx
const snapshots = await prepareScopeResources(RESOURCE_SCOPES.textDemo, locale);
// Browser navigation prefetch:
await prepare(planResourceScope(RESOURCE_SCOPES.textDemo, locale).plan);
// Provider:
<TextProvider scope={RESOURCE_SCOPES.textDemo} initialSnapshot={snapshots.text}>
  <ResourceScope scope={RESOURCE_SCOPES.textDemo}>{children}</ResourceScope>
</TextProvider>;
```

Server preparation, Provider initialization and navigation use the same scope
object and planner. Each entry is immutable; IDs and resource membership form one
discriminated union, so unknown IDs or mismatched requirements fail typechecking.
Scope IDs include layout and metadata and are not URL/pathname values.
The scope declaration is a site-owned entry with no dependency on
the Text implementation or planner; it is safe in both server and client code.
Language transitions include the startup and appended dictionaries of mounted Text Providers.

## AppConfig and Content

AppConfig remains one app.json for regular use. Its schema lives in src/site/config-schema.ts;
config.config.ts opts into namespace resource preparation. Consumers call
useAppConfig().get('app'). There is no business setter or locale dimension.

The Content reader has two synchronous reads. `content.get(namespace)` returns the original immutable JSON. `content.getResolved(namespace, { text })` returns a read-only projection in which each explicit `{ "$text": { "namespace": "demo", "key": "work.title" } }` becomes the result of that reader's `getText(namespace, key)`. Arrays and nested objects are supported. Plain strings stay literal. The `$text` property is reserved for exact references. Pass the active reader from `useText()` (or any compatible lookup), and prepare the referenced Text namespaces in the enclosing scope. Missing keys follow the supplied reader's policy. Resolution performs no I/O and never modifies the snapshot. AppConfig continues to expose the raw JSON reader.

Content schemas live in src/site/content-schemas.ts. content-resources.config.ts maps each
namespace to a tracked content/default/data/<namespace>.json and ignored
.local/content/data/<namespace>.json. app:prepare handles every declared kind;
content:prepare/check can prepare/check Content independently. All kinds retain
default/auto/custom, schema validation, freshness, atomic writes and rollback.

.generated/config and .generated/content each contain namespace JSON,
prepared.json, resources.json and manifest.json. The latter internal files are not
public HTTP payloads. Do not edit generated files. Names prepared, resources and
manifest are reserved to avoid artifact collisions.

Root Layout awaits Text and Config/Content snapshots in parallel and passes them
to ResourceLayout. ResourceScope starts all missing kinds together in CSR,
then releases its visual subtree. Complete SSR snapshots need no HTTP hydration
reads. Config/Content identities do not include locale, so switching language keeps
their readers and cached data. Server-only lazy imports and allowlisted HTTP JSON
routes read prepared outputs; payloads are absent from client JavaScript.

## Adding a namespace on demand

For Text, AppConfig and Content, use the nearest Provider of that kind. The root
Layout supplies all three. Mount a `ResourceScope` where the extra data becomes
necessary. In `/examples/content` the page already owns `catalog`. Opening
**Making notes** mounts this gate inside the page.

```tsx
<ResourceScope scope={RESOURCE_SCOPES.makingNotes}>
  <Notes />
</ResourceScope>
```

Only the notes section waits or retries. Once ready, any consumer of the page
reader can read `making-notes`, including after the section closes. Mount a
nested `ContentProvider` only when you want additions to belong to that subtree
and be released with it. Its reader also includes inherited namespaces.

If SWR or another loader already has the JSON, use `useAppendNamespace()` from
`@/infra/resources/client` in a Client Component, then call the returned
installer when the data arrives. It accepts a registered kind, namespace and
value, plus the selected locale for Text. Reinstalling the same artifact is safe.
Conflicting content for an installed namespace is rejected.

See [the resource model](../../../docs/common/resource-model.md) for shared design principles,
namespace/scope ownership, performance and how to replace the host integration.

## Explicit resource scope requirements

ResourceScope resolves requirements and publishes ready resources to their matching
Providers. Its nested ResourceBoundary provides the Guardian behavior.

Every ResourceScope takes an explicit RESOURCE_SCOPES entry, at Layout,
page or section scope. planResourceScope produces one multi-kind plan; the shared
ResourceBoundary owns all loads/waiting/errors/retries. Providers do not select the
ResourceScope input. Host bindings project SSR snapshots and publish completed resources
only to the corresponding owners. There is no JSON-specific parallel load loop.

Under the shared Runtime, a Content-only gate publishes to its nearest ContentProvider.
The Boundary renders its children when the requested readers are ready.
Partial SSR data is reused while only missing entries load. Config/Content plan
identities do not gain a locale when used without Text.

## Prepared maps and reader publication

prepareScopeResources(scope, locale?) is the server entry for every kind. Its
result has text/config/content snapshots only where requested; Root Layout passes
that result as ResourceLayout initialSnapshots. Browser warmup and ResourceScope
use planResourceScope(scope, locale?). Ordinary pages inherit Layout requirements.

Preparation generates server-imports.ts under each .generated kind from its
manifest. Add a namespace to its schema/configuration and its default data, then
prepare. Server loading and HTTP delivery require no second import list. auto
preserves local overrides; default/custom are explicit source policies.

JSON Providers prepare one immutable local container and reader candidate before
publication. Only a changed parent recomposes the view; it does not reconstruct
the local values. Runtime/ResourceBoundary own shared request/cache lifetimes.
