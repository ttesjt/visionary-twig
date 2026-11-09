# Providers, scopes and composition

Hosts using prepared text/config keep AppProviders as a short explicit composition in their
src/providers/app-providers.tsx. It receives public serializable values from the
root Server Layout and wraps AppConfigProvider → TextCatalogProvider → children.
It does not fetch, select profiles, open SQL, register every component or own editor state.
Both contexts are created once by app modules with the shared typed factories.
Text/config contexts are composed by the app.

For the namespace-based plain-next starter, see [resource Provider composition](#namespace-resources-in-plain-next).

## Getters, contexts and extension

Use a getter for a Server Component, metadata, pure helper or immutable server
instance. Use context only for values actually shared through a client subtree.
A new global context needs a typed input, a clear owner/update policy, minimum
scope, missing-provider error and tests. Instantiate its Context outside render,
add it explicitly to AppProviders only if genuinely app-global, then pass a public
server projection. No auto-discovery or automatic Provider registration exists.

A route-specific registration or editing session belongs around that feature,
with its resource key/reset and disposal. Wrapping it globally would change its
lifetime. New providers must document their ancestors, ordering, cleanup and
failure semantics. A callable service/adapter does not become a Provider merely
because several functions need it.

## Source workspace inventory

Paths below are repository-relative. Generated starters include only selected
shared dependencies; their app README is the authority for installed features.

| Export / source                                                                                        | Value, dependencies and lifetime                                                        | Failure / independent use / extension tests                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AppProviders; apps/* and templates/* src/providers                                                     | text/config parsed by root server; app lifetime, text changes with supplied locale      | Missing typed context throws; app-local factories prevent cross-app defaults; app/provider and clone tests                                                                                    |
| AppConfigProvider/useAppConfig; each src/config/context.ts                                             | public app schema/projection; root AppProviders ancestor, no locale switch              | Required; extend config schema/default/check hook; app-config and app tests                                                                                                                   |
| StudioTextCatalogProvider/useStudioTextCatalog; studio-ui src/text/context.tsx, public /session        | host workbench subset, editor subtree; no data transport                                | Standalone components retain DEFAULT_STUDIO_TEXT neutral English contract; real hosts explicitly inject their workbench subset. No site content fallback. Tests src/text and editor/workbench |
| HeaderExtensionProvider; site-shell src/header-extension/provider.tsx                                  | Header registration owner keyed by route scope; children register/release contributions | Required registry ancestor for extensions; scope replacement disposes old registrations. Tests header-extension                                                                               |
| NavigationPresentationProvider; content-blocks src/content-navigation/presentation/parts.tsx           | code registry; optional neutral default registry supports standalone navigation         | Restrict to reading feature; component registrations are code. Presentation tests                                                                                                             |
| ContentNavigationIntegrationProvider; content-blocks src/content-navigation/navigation-integration.tsx | neutral host Dock/Menu/geometry capability                                              | Optional independent navigation without host adapter; site/app supplies actual Header integration. Integration tests                                                                          |
| NavigationSurfaceActivityProvider; content-blocks presentation/parts.tsx                               | current navigation surface entering/leaving state                                       | Local subtree; preserve activity/animation semantics, navigation-motion tests                                                                                                                 |
| HeaderExtensionSurfaceContext; site-shell header-extension/surface-context.ts                          | Header surface state for one extension surface                                          | Internal Header subtree, not global; extension surface tests                                                                                                                                  |
| DemoPageSession; template studio workspace/demo/pages/page-session.tsx                                 | one project/resource, history, dirty/revision/conflict and publication acknowledgement  | Required page boundary; route/resource replacement cleans session; page/session and editor tests                                                                                              |
| DemoProvider; template studio workspace/demo/data/demo-provider.tsx                                    | explicit in-memory record/image adapters for demo workspace                             | Independent seed JSON, never UI locale; dispose with workspace. Demo reuse/tests                                                                                                              |
| Studio theme context; studio-ui src/shell/theme-context.tsx                                            | shell appearance scope supplied by Studio host                                          | Shell feature scope; independent policy/default semantics documented in studio-ui README; theme tests                                                                                         |
| StudioPageScope; studio-ui src/shell/page-outlet.tsx                                                   | active registered page and navigation props                                             | Page outlet only; registry validation/loading/error fallback; shell tests                                                                                                                     |
| TabsContext; content-blocks src/tabs/tabs-context.ts                                                   | single tab group selection                                                              | Required tab ancestor, no app registration; tabs tests                                                                                                                                        |
| ScrollBoundaryContext; content-blocks src/scroll-boundary/scroll-boundary.tsx                          | one sensor lifecycle and geometry observation                                           | Scoped sensor; standalone contract and scroll-boundary tests                                                                                                                                  |
| ContentReadingContext; content-blocks src/content-navigation/reading-store.tsx                         | one reading document's position/navigation store                                        | Document-scoped reset/disposal; reading tests                                                                                                                                                 |
| EditorRuntimeContext; puck-adapter src/editor/editor-context.tsx                                       | current Puck editor runtime                                                             | Editor only; no app-global state or persisted schema rename; editor/preview tests                                                                                                             |

Existing self-contained providers retain their original hook failure/neutral default
contracts; this migration does not change their dependency order. Check their
public package README for minimal feature examples. Third-party Puck contexts
remain owned by Puck and are not reimplemented here.

## Capabilities that are not global Providers

Theme uses HTML data-theme, CSS, validated cookie/preferences and existing controls.
ET/remote settings use app module instances/hooks. Storage adapters are created at
server integration boundaries and injected through neutral ports. Tabs, sensors,
reading and editor sessions remain component/feature scopes. None is automatically
lifted into AppProviders by the text/config migration.

## Minimal app recipe

```tsx
// root Server Layout
const text = getTextCatalog(locale);
const publicConfig = toClientConfig(getAppConfig());
return (
  <AppProviders textCatalog={text} appConfig={publicConfig}>
    {children}
  </AppProviders>
);
```

A client button uses the app's useTextCatalog; a public configuration consumer uses
useAppConfig. A server paragraph reads getTextCatalog directly. A new document
session wraps only its editor subtree, keyed to its resource. Test missing required
contexts, locale updates, config stability and route/session cleanup before moving
any wrapper. Build does not prove lifecycle correctness; use browser tests too.

## Provider reference recipes

All examples below run in a Client Component unless explicitly marked server.
Types come from the named schema or code contract, not from unvalidated JSON.
These examples complement the inventory above: internal Context values are owned
by their public component and should not be manufactured by an app.

### StudioTextCatalogProvider

`@frontend/studio/session` exports this provider and `useStudioTextCatalog`;
implementation is `studio-ui/src/text/context.tsx`. Input is
`text: StudioTextCatalog`, validated by `studioTextCatalogSchema`; the hook returns
that same UI-only workbench subset. This standalone UI prop is unrelated to stored
content protocol fields. For example, a host wraps its editor:

```tsx
<StudioTextCatalogProvider text={useTextCatalog().workbench}>
  <Editor />
</StudioTextCatalogProvider>
```

No other Provider is required for this scope. It has no storage/session ownership,
updates on the supplied text, and has no disposal work. Independently used shared
controls intentionally receive neutral `DEFAULT_STUDIO_TEXT` when absent; real
apps inject their validated subset. Extend `src/text-catalog.ts` and default JSON,
then test `src/text` and `src/workbench/control-text.test.tsx`. The broader editor
may still require its own session ancestors.

### Header extension

`HeaderExtensionProvider` from `@frontend/ui/web-shell/header-extension` accepts a
host `scope: string`. It owns a single slot for contextual controls.
`useHeaderExtension` registers a contribution and releases it on cleanup. A
changed scope clears the previous registry. Arrange the provider around the
header and the components that contribute to its slot. See the
[Web Shell guide](../packages/shared/ui/README.md#optional-header-extension)
for composition and ownership rules.

Applications that dock content navigation supply their own Dock, Menu and
geometry through the shared `ContentNavigationIntegrationProvider`.

### Studio workspace, data and page sessions

Template `DemoProvider` in
`packages/templates/studio/src/workspace/demo/data/demo-provider.tsx` has children
only. `useDemoData()` returns scope/selectedId/select; `useDemoRecords()` and
`useDemoPages()` expose subscribed record snapshots. Example:
`<DemoProvider>{demoWorkspace}</DemoProvider>`. No ancestor is needed by its storage
scope; business data is seeded from `seed.json`, not UI text. It creates one
in-memory scope per mount and disposes it on unmount. Missing provider throws;
this demo never silently substitutes for a production adapter. Extend demo ports
and tests under `src/workspace/demo`; no root-global registration exists.

Template `DemoPageSession` / `useDemoPageSessionContext` follow the same persistent-layout
rule in `src/workspace/demo/pages/page-session.tsx`, with initial `DemoPage`, base
and search inputs, and DemoProvider. The hook exposes
pageId/session/files/drafts/operations and preview preferences. The public component
is the setup surface, not the private PageSessionContext. Editing modes stay
mounted deliberately; leaving the resource releases guards and workspace state.
Its missing-context error is explicit. See template demo page/navigation tests.

`StudioThemeScope` and `StudioPageScope` are owned by `StudioShell` in
`@frontend/studio/shell`. Theme input is `StudioThemeState` (policy, preference,
setPreference); `useStudioTheme()` returns it and throws outside the shell.
Page scope contains the typed `StudioPageContext` (page, registry, navigate).
`StudioPageOutlet` reads it, throws without the shell, and rejects a route-owned
entry that has no host route content. Use the tested StudioShell example in the
package guide
with a registered component, or `<StudioPageOutlet />` in a shell child route.
The shell owns appearance and page error/retry boundaries, not storage/auth.
Theme follows host-controlled values or the shell's mount lifetime; page changes
replace page content without replacing the shell. Registry/theme/shell tests cover
extension and missing-scope behavior. Do not mount these internal scopes manually.

### Component and editor contexts

These contexts are Client Component internals. The supported independent setup is
the owning public component, not a raw Context.Provider with invented values.

| Context / typed value and consumer                                                                                     | Minimal public setup                                                                                      | Lifetime, failure and extension                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TabsContext (`tabs/tabs-context.ts`), registered panels/selection/enhancement/editing; TabPanel consumes it            | `<Tabs label={text.tabs}><TabPanel label={text.panel}>{body}</TabPanel></Tabs>`                           | No app ancestor; one group per mount, DOM registration cleanup on panel removal; TabPanel requires Tabs. No remote data/session role. Extend Tabs/TabPanel and `src/tabs` tests.                                                                                                            |
| ScrollBoundaryContext (`scroll-boundary/scroll-boundary.tsx`), ScrollBoundaryState via useScrollBoundaryState          | `<ScrollBoundary range="within"><Status /></ScrollBoundary>`                                              | No app ancestor; validates range/offset/disabled, observes one region, unsubscribes on change/unmount; hook throws outside boundary. Does not move/hide content. Extend observer/schema and boundary tests.                                                                                 |
| ContentReadingContext (`content-navigation/reading-store.tsx`), ReadingStore → useContentReading returns href/progress | `<ContentNavigation label={text.navigation} items={items}><ReadingBody /></ContentNavigation>`            | One document reading scope; observers/subscribers cleaned by owner, hook throws outside it. Header contributions retain this reading scope. No global reading history. Extend reading store/navigation tests.                                                                               |
| EditorRuntimeContext (`puck-adapter/src/editor/editor-context.tsx`), EditorRuntime via useEditorRuntime                | Mount ContentEditor from `@frontend/puck-adapter/editor` using its documented document/registry callbacks | One editor document and structured drafts, issues, bound props and unbind operation; hook throws without the editor. Not a persisted protocol or app Provider. The owner handles draft/field cleanup. Extend editor field/runtime tests, and use the package's tested ContentEditor recipe. |

`HeaderExtensionSurfaceContext` is similarly an internal, non-public readiness
signal; HeaderExtension owns it. Third-party Puck contexts remain Puck's API.
These contexts need React runtime, and may be prerendered through their public
Client Component; observers and interaction start only on the client.

In plain-next the initial route locale is resolved before Root Layout rendering. TextProvider initializes it synchronously; nested boundaries add namespaces without choosing another language. See the actual nondefault entry and cache-factory regressions in the template and resource-runtime tests.

## Namespace resources in plain-next

The root `ResourceLayout` supplies a shared Runtime and Providers for Text,
AppConfig and Content. A lazy section normally mounts just `ResourceScope`.
Its Boundary gates that section while the nearest Provider of each kind gains
the requested namespaces. All consumers of that Provider can then read them.
Unmounting the section leaves installed resources with the Provider.

Nest a same-kind Provider for independent visibility or lifetime. Its reader
includes the parent reader and its own local additions. In App Router a Server
Page can also pass a page-specific SSR snapshot down to a page Provider so hooks
can read it on first render. Other pages can inherit the Layout readers directly.

This opt-in integration does not change the legacy context factories or existing
apps. See the standalone [resource initialization guide](resource-initialization.md#resource-scope-composition) for scope publication and SSR handoff.
