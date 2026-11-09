# Content Studio

Local Next host for `@frontend/studio`. Uses neutral content only.

Run `pnpm dev --app {{appId}}` from the repository root. The shared runner builds packages,
then watches their outputs alongside the loopback Studio host on port 3001.
`pnpm test:e2e --app {{appId}}` builds packages and Studio, then runs production Chromium on
port 3121. `PLAYWRIGHT_PORT` overrides both server startup and browser baseURL.
`pnpm test:e2e --all` and CI discover Studio alongside web and Gallery from workspaceApp.
The thin Playwright config and dedicated JSX/Node/DOM E2E typecheck reuse root tooling.
No website example switches or fixture credentials are needed.

The host explicitly selects foundation/content/studio CSS. Puck editor CSS is
scoped to the workbench route group. Preview pages use only render CSS.

## Temporary server preview

The workbench POSTs to `/api/preview`, then embeds `/preview/[id]?theme=…`.
The Next page invokes the existing RSC ContentRender with the same schemas and
raw document/context; editor CSS is absent. This is a local single-process host.

The POST checks actual Origin/Host against loopback, application/json, bounded
streamed UTF-8 JSON, full document/context and expanded-data validation. It reads
no arbitrary files, URLs, credentials or environment secrets. Previews have a
5-minute TTL and a FIFO capacity of 32. Wrapper requests are bounded by twice the
content byte limit plus envelope overhead, with a 10-second body deadline.
Expired entries are removed on access/insertion. Restart resets previews.

A server-only process store shares snapshots between Next route and RSC bundles;
this is temporary preview state, not saved documents or durable drafts. Responses
are no-store/noindex. Unknown, evicted or expired IDs show a recovery message.
Future network, multi-instance or cloud hosting requires separate access/storage design.

Media URLs resolve against the Studio host. Neutral resources belong in public/;
absolute HTTP(S) URLs can also be used. A root-relative URL from another application
must be rewritten for a resource actually available to Studio. Missing resources
show existing content-block failure states with retained dimensions/captions.
There is no arbitrary disk-folder import or media manager.

“Open neutral example” opens the migrated general-purpose content sample. Its
local media and provenance live in public/samples/media. Generic editor image
blocks can use the host's /placeholder.svg; replace media URLs with resources you
want to keep. A new Video still needs a reachable host-owned video source.

## Theme policy

Default behavior remains selectable light/dark/system. Set the host process's
UI_THEME_POLICY to selectable, light or dark. Fixed modes set initial server HTML,
ignore preferences and omit controls. Studio previews enforce policy server-side.
Invalid configuration fails explicitly.

```sh
UI_THEME_POLICY=light pnpm dev --app {{appId}}
UI_THEME_POLICY=dark pnpm dev --app {{appId}}
```

Hosts map configuration to the pure @frontend/ui/theme ThemePolicy. Code can also
use a selectable policy with a different defaultPreference. Each app owns this
non-secret process configuration; host layouts render per request so server HTML,
controls and previews agree. No Provider is needed.

Run `pnpm test:e2e:theme-policy` to check both fixed modes for every existing app
through the shared production runner. Normal all-app tests retain selectable-mode
coverage. The runner also accepts `--grep <pattern>` for explicit focused checks.

## Prepared Studio resources

Run `pnpm app:prepare` in the Studio directory before development or build.
The defaults and optional local overrides are:

| Resource                    | Tracked default                     | Local override                     |
| --------------------------- | ----------------------------------- | ---------------------------------- |
| Workspace and editor labels | `content/default/text/en/main.json` | `.local/content/text/en/main.json` |
| Public settings             | `config/default/app.json`           | `.local/config/app.json`           |
| Initial demo records        | `content/default/data/base.json`    | `.local/content/data/base.json`    |

Text uses flat keys such as `workspace.brand`. Set `workspace.showIntroduction` in AppConfig to control the overview description. The Content resource seeds a fresh editing session. Subsequent edits belong to that session.

Preparation merges optional overrides and writes versioned resources under `.generated/`. Run `pnpm app:check` to check freshness or `pnpm app:prepare --source default` to prepare the tracked inputs explicitly. Keep local overrides out of Git.

The localized Server Layout prepares the layout scope and passes its snapshot to `ResourceLayout` before rendering the workbench. Metadata and iframe preview read the same prepared Text on the server. A client reader projects flat labels into the structured props used by Studio components. Resource declarations live in `src/site/` and the reusable runtime lives in `src/infra/`.

## Event tracking

Tracking starts disabled. The server preview endpoint can send `preview_snapshot_accepted` after it accepts a snapshot. The event contains a status field only. To enable delivery, set `tracking.enabled` in AppConfig and configure the server-only `EVENT_TRACKING_URL`. Both the browser tracker and preview client use `src/site/tracking-permission.ts`. A preview POST without an explicit grant skips tracking. Hosts with a server-side consent record can also verify it per request in `src/site/preview-tracking-permission.server.ts`. A client grant alone is not proof of that record. Review requirements for your deployment and supply any required notices and consent controls before enabling tracking.

## Data reading

SWR is a default dependency, not a global request. See [data fetching](../../docs/data-fetching.md) for domain hooks, keys, errors and the Node cache convention. The Web starter includes `/examples/remote-settings` with cached, validated static JSON and two independent consumers. Other apps do not need to invent a flags request.

The default route opens a configurable Studio workspace. `/demo` demonstrates
a record table, selected-row fields and live preview. `/demo/pages` lists independent pages; its child routes host the resource-owned editor. Register pages
in `src/workspace/registry.tsx`, keep route IDs in `page-ids.ts`, and add their copy
to the default dictionary before preparing it. Hosts own navigation, data adapters
and page-specific actions. The shell has no built-in business resource model.

Demo Pages composes `studio/session`, `studio/editor`, `studio/files`
and `studio/publishing` with its own in-memory publication and association operations.
Custom resource pages own their data and workflow; there is no global `/editor` route. Demo data resets on leaving/reloading. The old `/example`
and `/notebook` preview URLs redirect to `/demo`.

## Resource creation example

`/demo/upload` is a real child route inside the shared Demo layout. Fields and
optional image URL/file are drafts until Publish. The example runs image adapter
then record adapter; the default instances use Blob URLs and browser memory, not
SQL or a cloud service. Created records and images survive navigation within
Demo; refresh resets them. See `src/site/demo-adapters.ts` to replace the
instances and `src/workspace/demo/publishing` to customize the workflow. The
sidebar registers Demo once; Next filesystem routes own its child pages.

## Pages, local files and item association

`/demo/pages` lists published Page resources; `/demo/pages/new` creates a working
session. `/demo/pages/[pageId]/edit` opens a page in this module's memory adapter.
An item's Create/Edit page link selects its page or starts a new session with a
pending item destination. `/editor` is removed and returns 404.

Items hold an optional pageId; the memory owner derives reverse associations.
Pages store complete validated Studio projects with all published catalogs, raw
bindings and context. Page resource identity is independent of documentId inside
imported content. A page may publish independently, without an item.

Selecting an item is pending until Publish. Page content and its association
commit together; one item and one page may each have only one association in this
Demo. Existing bindings cannot be changed in place. Confirmed Unbind immediately
clears the association, keeps the published page and preserves working content.
Unbind advances revision; stale publication cannot silently restore an old link.
The template owns these rules; reusable editors do not impose one-to-one binding.

Open JSON and complete-project JSON replace working content while retaining the
host's Page ID, target revision and item association. Imported identity hints are
not adopted. Save and Save As only write complete local files; Save As creates no
new memory resource. Publish validates all current languages and writes a captured
snapshot. Late responses do not mark newer content as published. Conflict/failure
leaves working content available; return to Pages and reopen the current version
to resolve conflicts. New publication stays in the current working session; its
stable edit URL is available in Pages.

The host guards ordinary internal links and closing/reloading while there is
unpublished work. Browser history navigation remains a router integration concern.
All data is module-scoped memory and resets on refresh or leaving Demo. No SQL,
cloud upload or durable backend is present. Replace the adapter and resource code
for a real host, including transaction/version checks, authorization and persistence.

Preparation defaults to auto: each optional `.local/content/text/<locale>/<namespace>.json`, `.local/config/<namespace>.json` and `.local/content/data/<namespace>.json` independently overrides its matching default. Missing override files are allowed; malformed existing files fail. Run `pnpm app:prepare --source default` to ignore overrides. Root `pnpm bootstrap --include-templates` includes source templates; ordinary bootstrap targets apps only.

## Plain Next.js foundation and Studio extensions

The initial foundation commit copies the complete plain-next starter at
`3dd6a47a94176c2d650fa628a10b1fbf8ab1560c`, then adapts the host name and ports.
The following Studio commits add the editor, its resources and its permissions.
The resource runtime, scoped readers, Content text-reference support, metadata
builder, environment validation, HTTP helpers and error views live in `src/infra/`.
Studio declares its own inputs and policies in `src/site/`.

Studio uses the metadata builder with prepared text and optional metadata config.
`src/site/metadata.ts` owns its `noindex, nofollow` policy. Localized 404 and page
errors use the prepared main dictionary. The global error view uses synchronous
startup text and remains usable if resource preparation fails.

The workbench owns a cookie-based theme extension in `src/theme/`. It preserves
the selected preference in server HTML and works with JavaScript disabled. The
root Layout and workbench use that extension together; preview overrides remain
isolated inside their frame. The foundation's browser-storage theme module stays
available in `src/infra/theme/` for hosts that choose that policy.

The editor replaces the starter's demonstration pages. Its main Text dictionary,
app configuration and base Content remain independently prepared through the
same default/custom/generated workflow. Foundation tests cover the generic
runtime; Studio tests cover its ownership rules, editor and isolated preview.
