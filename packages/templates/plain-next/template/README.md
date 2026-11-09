# Your Next.js site

| I want to…          | Start here                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Change the homepage | Edit `src/app/[locale]/page.tsx` or its starter UI in `_components/home-page.tsx` beside it.                                                      |
| Change the words    | Edit `content/default/text/<locale>/main.json`, then prepare the app. The reference language defines the keys.                                    |
| Add a page          | Add `src/app/[locale]/about/page.tsx`. Ordinary pages inherit the global resources. Declare a scope only when a page or section needs extra data. |

From the workspace root:

```sh
pnpm bootstrap --app {{appId}}
pnpm dev --app {{appId}}
```

After editing resource inputs, run `pnpm app:prepare --app {{appId}}`.
Build with `pnpm build --app {{appId}}`. A stale or missing prepared input causes a check failure before dev or build.

The homepage uses native HTML for layout.

## Translating a page

Start with the reference language (English by default). Other languages can translate a few keys at a time. Keep a JSON file for each declared locale/namespace; use `{}` to inherit it in full. Preparation uses the target language's custom override first, then its tracked translation, then the prepared reference value. It lists any keys it inherited. With a complete generated dictionary, the page only loads the requested language.

To choose a different reference, set `referenceLocale` in `text-resources.config.ts`. Choose `missingKeys: 'error'` there to require complete tracked translations. Unknown keys, empty strings and invalid placeholders fail preparation under both policies.

## Environment variables

The generated app includes `.env.example`. On first setup, copy it to `.env.local` in this app's root, next to `package.json`. Keep an existing file and add only missing settings. Next loads `.env*` from the app directory. Shell or hosting-platform environment variables take precedence over these files.

The example file contains a loopback service URL and a fictional key. Replace them with your service configuration when needed. Local env files are ignored; the generator copies only `.env.example`. Deployment platforms can inject the same variables through their environment/secret settings.

Declare server variables in `src/site/environment.ts`. Server code reads a capability's schema with `readServerEnvironment` from `src/infra/environment/server.ts`. Its `server-only` boundary prevents client imports. Validation happens when that capability is used, so installation and builds do not require upstream credentials. Errors identify fields without printing values.

A `NEXT_PUBLIC_` variable is public and its direct references are inlined into browser JavaScript during `next build`. Set these before building. Private keys use server-only names. Keep secrets out of React props, response bodies and generated Text/AppConfig/Content data. Restart the development process after changing its environment.

## Metadata

Edit `src/site/metadata.ts` to change the switch or the resource mapping. It reads
localized `metadata.*` keys from your prepared Text and an optional `metadata.image`
from AppConfig. You can rename those namespaces/keys or replace the source by editing
this function. Infrastructure does not require the starter's JSON names or shape.

Set `metadataDefinition.enabled` to `false` to skip this workflow and its source reads.
Next's standard tags, `src/app/icon.svg` and separately declared page metadata still
apply. An absent optional field is omitted; a broken declared reference is an error.
The strict metadata reader never publishes missing-key placeholder strings.

For production links, set `SITE_URL=https://example.com` before building. Without it,
canonical/language links and relative share images are omitted. Replace the neutral
`public/metadata/share.png` and `src/app/icon.svg` with your assets. Prepare after any
Text or AppConfig source changes. Local overrides use the existing ignored paths.

Layout prepares common metadata without assuming a child URL. A page may call
`siteMetadata(locale, '/about')` from its Server `generateMetadata` to declare its own
canonical and language versions. The homepage does this for `/`. Metadata follows
the server URL locale; the in-page reader language selector does not rewrite the URL
or document head. These defaults preserve normal SSR/SSG.

See [Metadata](../../docs/metadata.md) for the source contract, optional fields,
Next's inheritance rules and deployment details.

## What you own

`src/site/` holds the declarations consumed by the starter. You can reorganize their implementation or re-export them from the same entry points. The starter places no directory requirements on your own features.

| Capability                            | Site entry                                                       | Content                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Languages and Text namespaces         | `src/site/text.ts`                                               | Flat JSON in `content/default/text/<locale>/`.                                             |
| Global, page and section requirements | `src/site/resource-scopes.ts`                                    | Each scope lists the Text, AppConfig and Content namespaces it needs.                      |
| AppConfig and Content schemas         | `src/site/config-schema.ts`, `src/site/content-schemas.ts`       | `config/default/<name>.json`, `content/default/data/<name>.json`.                          |
| Metadata and startup messages         | `src/site/metadata.ts`, `src/site/startup-text.ts`               | Metadata maps prepared resources; startup messages also work before Text is ready.         |
| Server environment                    | `src/site/environment.ts`                                        | Capability schemas; private values come from the app env or deployment platform.           |
| Theme                                 | `src/site/theme-policy.ts`, `src/site/theme.ts`                  | Theme policy reads `UI_THEME_POLICY`; `THEME_STORAGE_KEY` owns the browser preference key. |
| Event tracking                        | `src/site/tracking-events.ts`, `src/site/tracking-permission.ts` | Event definitions, endpoints and the site's permission policy.                             |

The default preparation mode merges optional overrides from the ignored `.local/` paths with tracked defaults. For example, override `home.title` in `.local/content/text/en/main.json`. The other inputs use `.local/config/<name>.json` and `.local/content/data/<name>.json`. To select only tracked inputs, run `pnpm app:prepare --app {{appId}} --source default`. Preparation owns `.generated/`.

## Theme preferences

The starter uses one `next-themes` Provider in the root Layout, outside the
prepared-resource Providers. It restores a browser preference from localStorage,
responds to system changes when System is selected, and synchronizes tabs on the
same origin. Theme is a user preference; it is separate from AppConfig and never
enters the Text/Config/Content preparation plan.

`src/site/theme-policy.ts` keeps the existing `UI_THEME_POLICY` choices:

- `selectable` is the default. A new browser follows its system preference; users
  can choose Light, Dark or System.
- `light` and `dark` force that scheme and hide the control. They ignore a saved
  preference without replacing it, so the preference is still available if the
  site later becomes selectable.

Prerendered routes use the build-time policy. Keep the build and start values
consistent. The server emits that policy's root attribute; it does not read a theme
cookie or browser storage. The library's early inline script applies the saved
choice before visible content, independently of React hydration. This preserves
normal SSR and SSG. With System selected, the browser's `data-theme` attribute is
resolved to `light` or `dark`; the control and storage value remain `system`.
CSS tokens still own all colors, and the library updates native control
`color-scheme` too. Theme changes temporarily suppress CSS transitions.

Only Light, Dark and System are supported preferences. If a saved value is
unsupported or empty, the adapter falls back to the selectable policy's default,
repairs storage when writable and corrects the root scheme before visible content.
A small validation script runs after the library's early script with the same CSP
nonce. Runtime invalid values, including storage events from another tab, are
normalized through the library's setter too; the control never merely displays a
fallback while leaving the library state unchanged. Fixed policies leave saved
values untouched, including unsupported ones.

Change `THEME_STORAGE_KEY` in `src/site/theme.ts` if independent sites on the same
origin should use different preferences. Ports are part of the origin, so separate
development ports do not share storage. When storage is blocked, selection still
works in memory; it cannot survive a reload.

### Theme-dependent controls and hydration

Use `useThemePreference()` from `src/infra/theme/client` for preference-dependent
UI. It returns `preference`, `isFixed` and `setPreference`. `preference` is
`undefined` during server rendering and the first hydration pass. The hook uses
React's server/client snapshot mechanism, then exposes the saved preference.
The homepage selector keeps a disabled, neutral option in the same-size control
until then. The rest of the page renders normally. In fixed mode the setter does
nothing, and the control is omitted in both SSR and the browser.

Do not guess a stored preference in server markup or conditionally change a
server-rendered icon from localStorage during the first client render. Follow the
selector's readiness handling, or use stable markup with CSS-driven theme variants.
The root `html` uses `suppressHydrationWarning` only for the attribute/style changes
made by the early script; mismatches in the rest of the application remain errors.

### Script and failure boundaries

First-paint restoration requires the early script to be allowed to run. Without
JavaScript the server-rendered content still works, using the fixed policy or CSS
system palette; a saved localStorage choice cannot be restored. Strict CSP must
allow the theme script and its temporary transition style. The infrastructure
`ThemeProvider` accepts a `nonce` for both. The starter does not invent a per-request
nonce or read request headers, since that is a deployment choice with implications
for static generation. See the [library's CSP guidance](https://github.com/pacocoursey/next-themes#themeprovider).

The fatal `global-error` document stays independent of the root Providers. It uses
the default CSS palette and does not promise to restore a personal theme during
root failure.

Production browser tests hold external hydration scripts while checking the first
contentful paint, actual colors and neutral control. They then release hydration
and check selection, control dimensions and React diagnostics. Other cases cover
refresh, client navigation, OS changes, real cross-tab storage events, blocked
storage and both fixed policies. These infrastructure tests stay when deleting demos.

## Adding page-specific content

1. Add the JSON in `content/default/data/` and its schema to `src/site/content-schemas.ts`.
2. Add a scope in `src/site/resource-scopes.ts` referencing that namespace, then run `app:prepare`.
3. For a server-rendered page, call `prepareScopeResources(scope, locale)` and pass each requested snapshot to its Provider. The locale is optional for a Content-only scope. Wrap the consumer in `ResourceScope`.
4. For an optional section, mount `ResourceScope` when the section opens. The nearest Content Provider gains the namespace; the rest of the page stays usable.

For a translated Content field, accept `contentTextReferenceSchema` in its site schema and store a reference such as `{ "$text": { "namespace": "demo", "key": "works.paper-study.title" } }`. A union with `z.string()` also accepts a literal title. Declare the dictionary in the route scope or inherit it from Layout. A page prepares its content and referenced dictionaries in parallel, then passes the snapshots to its Providers.

```tsx
const content = useContent();
const text = useText();
const works = content.getResolved('catalog', { text }).works;
```

`works[i].title` is now a string. Switching languages resolves the same catalog with the new reader. Use `content.get('catalog')` when you need the original JSON, including the references.

Page components use the public `@/infra/resources/client` hooks. Server preparation is available from `@/infra/resources/server`. The root Layout wires these up. `src/infra/` holds the template-maintained implementation and can be upgraded separately from site declarations. Keep the two HTTP route entries in `src/app/resources/` and the Next Proxy and instrumentation entries when using this infrastructure.

## Page errors and recovery

| Failure                                                           | Owner                            | Recovery                                                                                  |
| ----------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| An unknown page or explicit `notFound()`                          | `src/app/[locale]/not-found.tsx` | A real 404 response for ordinary direct visits and a native homepage link.                |
| A page's server preparation or render fails                       | `src/app/[locale]/error.tsx`     | Next's route `retry` fetches and renders the segment again; Home leaves the failed route. |
| A root Layout, global Provider or root resource preparation fails | `src/app/global-error.tsx`       | A standalone HTML document with Reload and Home.                                          |
| A client resource request, validation or reader publication fails | The nearest `ResourceBoundary`   | Retry that resource region, retaining its existing behavior and cache.                    |

Ordinary 404 and page-error labels are the `status.*` keys in each locale's
`main.json`. Edit and prepare those as usual. The global fallback deliberately
uses the small synchronous `GLOBAL_ERROR_TEXT` declaration in
`src/site/startup-text.ts`: it must work when main Text cannot load. It uses
English immediately, without fetching a translation or switching after render.
Resource startup labels remain in the same site entry.

The `src/infra/errors/` presentation accepts ready text and native recovery
links. It does not load resources. The global entry supplies its own HTML, title
and default styles so it does not depend on the failed Layout. Only a safe Next
error digest is displayed as a reference; raw messages, stacks and request values
are never rendered in these views. Server diagnostics remain in server logs.

Keep `[locale]/[...unmatched]/page.tsx` for unknown page paths and
`[locale]/not-found/page.tsx` as the explicit `/not-found` target for invalid
language rewrites in Proxy. The Proxy clears invalid language input and returns
404 instead of redirecting to a successful page. APIs and versioned resource
routes retain their own HTTP/JSON error protocols.

With this dynamic locale root, the installed Next version reconstructs the
custom 404 and fatal global-error interface in the browser. HTTP 404/500 semantics
still apply, but those custom interfaces require JavaScript. Regular pages retain
their existing SSR and static generation. An error after streaming has started,
including a metadata failure, can retain HTTP 200. Segment errors cannot catch
errors in their own Layout; event-handler and async callback failures also need
explicit handling.

Production verification injects faults only into a disposable generated project,
checks server/client page retries, metadata/root failures and dictionary-independent
global recovery, then restores and rebuilds that project. There is no public
fault-trigger route or test switch in the shipped starter.
