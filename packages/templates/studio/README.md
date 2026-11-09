# @frontend/template-studio

Runnable source template in packages/templates/studio. It selects only neutral
shared capabilities and has its own installed workspace dependencies.

Use pnpm dev --app template-studio from the root for dependency build/watch and the
configured template port. Run pnpm build:packages once before building directly
in this directory; pnpm build then runs Next normally. Root validation covers
this source alongside plain-next and the framework packages; no consuming apps
are required.

Create a Studio workspace or add Studio to an existing generated workspace from
the source repository root:

```sh
pnpm repo:clone --output ../new-project --template studio --app-name editor
pnpm template:clone --target ../existing-project --name editor --template studio
```

The app lives at apps/editor; the generator assigns unused target ports.
template.config.mjs and template/initialize.mjs own this starter's output recipe;
template/README.md becomes the generated app README. The generator supplies paths,
dependencies, root settings, installation and validation. See the
[template contract](../README.md) and [generation protocol](../../../docs/template-repository/generation.md).

Historical provenance is recorded in ../catalog.json. The generator delivers
the Studio site package with this template. Framework source imports remain
internal or public package imports. The initializer adjusts configuration for the
destination.

## Event tracking

Tracking starts disabled. The server preview endpoint can send `preview_snapshot_accepted` after it accepts a snapshot. The event contains a status field only. To enable delivery, set `tracking.enabled` in AppConfig and configure the server-only `EVENT_TRACKING_URL`. Both the browser tracker and preview client use `src/site/tracking-permission.ts`. A preview POST without an explicit grant skips tracking. Hosts with a server-side consent record can also verify it per request in `src/site/preview-tracking-permission.server.ts`. A client grant alone is not proof of that record. Review requirements for your deployment and supply any required notices and consent controls before enabling tracking.

## Data reading

SWR is a default dependency; use a domain hook only where data is actually read. See [data fetching](../../../docs/common/data-fetching.md). The Web template provides `/examples/remote-settings`; no global flags request runs in this app's layout.

## Portable project editing

This starter uses the Studio site package for project JSON, language catalogs, explicit variable binding, unified undo/redo, native Save/Save As and download fallback. It runs without a database or provider package. Its app-owned flat main dictionary is prepared into versioned namespace resources and loaded through the shared resource plan; dictionary payloads are not statically imported into client bundles.

Durable SQL/project associations, cloud media storage and a production publication service are not included. The memory workflows and temporary preview endpoint demonstrate the host integration. A consuming app injects its own publication/storage capabilities; credentials and browser file handles never belong in project JSON. See the Studio package contracts.

## Workspace routes and extensions

`/` opens the new general Studio workspace. Page registration and host routing live
in `src/workspace/registry.tsx`, `page-ids.ts` and `workspace-host.tsx`. Each
registered page is custom React code; the shared shell knows no business fields,
database tables, storage destination or publication rules. Labels come from `workspace.*` keys in the
prepared main dictionary. The persistent route layout supplies navigation
and keeps appearance while moving between registered pages.

`/demo/pages/new` and `/demo/pages/[pageId]/edit` compose session, editor, file controls and memory-backed publication inside the persistent workspace. `/preview/[id]`, file operations and existing API
routes keep their original contracts. The new shell does not fetch or write to
those data APIs merely by opening or navigating it.

To add a page, define its stable ID in `page-ids.ts`, add its translated page copy,
write its component and register it with a group/icon in `registry.tsx`. The
sidebar comes from that registry. The component receives `page`, `registry` and
`navigate`; it owns its other state and injected services. The host validates
registered route IDs and returns actual 404s for unknown paths. Reprepare copy
after changing dictionary keys. Shared styles are imported by the workspace
route group; individual pages use the global `ui-studio-*` hooks.

`/demo` is a custom record page: an in-memory table, selected-row fields and a
live card preview. It is not a SQL client or a durable database. Data lives in the resource layout and survives child navigation; refreshing resets it. `/example` and `/notebook` redirect to `/demo`.
The starter imports the Studio site package and neutral shared libraries.

The reusable editor has no automatic resource loading or publication. A custom
page supplies its own session and operations through the public Studio
entries. SQL queries, resource identity, media upload and publication belong to
the page's code and injected adapters. See Studio's composable editing contract.

## Demo creation and subroutes

`/demo` and `/demo/upload` are actual Next pages under one `demo/layout.tsx`.
The workbench layout keeps StudioShell mounted; the workbench layout owns one scoped
memory store and image adapter. Navigation registration contains one route-owned
Demo entry, not a manual switch between all its leaf components. Child routes
keep the same sidebar entry active. Use Link for internal navigation.

The upload form supports no image, an existing HTTP(S)/host-relative image URL (or a Blob URL from this Demo),
or a local PNG/JPEG/WebP/GIF. Fields and selected files remain drafts until
**Publish demo record**. File previews create only temporary local URLs, without
calling the image adapter. Publish validates, resolves a file through the image
adapter, then passes the resulting optional imageUrl to the record adapter.
URL mode skips image upload. The list inspector also requires Apply changes.

Contracts and example orchestration live in `workspace/demo/adapters` and
`workspace/demo/publishing`. Concrete demo instances are selected in
`src/site/demo-adapters.ts`. The default image adapter returns Blob URLs;
the record adapter writes browser memory. No SQL or storage server is connected,
and a refresh resets data. Images persist across Demo subroute navigation; the
resource scope releases its URLs when disposed. Changing route does not store
browser file handles or image bytes in copy JSON.

A failed record step keeps the form and uploaded reference for retry, using the
same record identity. Duplicate submission is blocked. Cancellation ignores late
UI completions; a successful record write retains its referenced image. `release`
means local resource cleanup, not a universal remote object deletion guarantee.
A real host supplies actual persistence, access control, idempotency and remote
orphan-media policy. The example workflow is ordinary code and may be replaced.

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

Open JSON replaces working content while retaining the
host's Page ID, target revision and item association. Imported identity hints are
not adopted. Save and Save As only write complete local files; Save As creates no
new memory resource. Publish validates all current languages and writes a captured
snapshot. Late responses do not mark newer content as published. Conflict/failure
leaves working content available; return to Pages and reopen the current version
to resolve conflicts. New publication stays in the current working session; its
stable edit URL is available in Pages.

The host guards ordinary internal links and closing/reloading while there is
unpublished work. Browser history navigation remains a router integration concern.
Demo records and pages live in workbench-scoped memory and reset on a full reload. No SQL,
cloud upload or durable backend is present. Replace the adapter and resource code
for a real host, including transaction/version checks, authorization and persistence.

## Page management layout

Demo page routes keep Back, page name, local Save/Save As and Publish in a compact
core toolbar. Overview, Association, Files and Copy & languages are separate tabs.
Overview shows resource identity and revision; Files owns content replacement;
catalog editing stays in the same page session. Tab panels remain
mounted, so hiding a panel does not clear input or bypass unapplied-draft checks.
Long panels scroll within a bounded region instead of expanding the resource
header. The default lower region is a read-only Viewer of the applied working copy.

## Viewer and focused source editing

Resource routes (`/demo/pages/new` and `/demo/pages/[pageId]/edit`) show a Viewer
by default. `Edit JSON` opens the corresponding `/json` child route. It uses the
same session, file handles, target revision, pending Item destination, source
buffers and applied project history. The Next editing layout owns these objects;
mode-specific pages only compose controls. Management tabs remain mounted and
hidden in focus mode, preserving incomplete catalog fields too.

The focused page hides workspace navigation and resource management. Its compact
header provides Back to page and working-copy Undo/Redo. JSON / Preview tabs keep
their panels mounted. Select Layout document, Language catalogs or Context to edit
source. Format and Validate are non-mutating. Apply validates all staged sections
and updates the working copy and Viewer together. Reset explicitly discards only
one section. Concurrent section edits produce an actionable conflict instead of
overwriting the newest content.

Return to the resource page to use Save / Save As (complete local working files)
or Publish (revision-checked Demo memory resource and pending association). Neither
Apply nor a local save publishes. Staged inputs block local save/publication.
Internal switches among this resource's Viewer/JSON/Puck routes need no discard
confirmation. Leaving the resource through ordinary app links retains the existing
dirty-work confirmation. Refresh and leaving Demo still reset this in-memory demo;
there is no durable draft backend.

The `/puck` child route is explicitly experimental and never the default. It
reuses the same applied project and history, and edits only the applied working copy while source
drafts remain separate. Concurrent same-section changes are reported as conflicts. After first use its instance remains mounted when hidden, retaining unfinished
fields across mode routes. Unapplied inputs in another editor must be resolved
before Apply can replace the working copy. It retains basic interactive canvas functionality;
interaction quality is not production-ready. Supported work should use JSON and
Viewer. Actual previews remain isolated pages without Studio/Puck styles.

All new labels use prepared template copy: `jsonEditor` uses the neutral shared
schema, while `workspace.demo.pages.editing` names template routes/actions.

## Studio and preview appearance

The top appearance button controls the entire Studio, including resource panels,
JSON fields and focused editor routes. They inherit the persistent `StudioShell`
appearance through `useStudioTheme()`; the editing layout does not read a second
policy or initialize another UI preference.

The Next host records explicit choices in a `studio-theme` cookie for one year
(`STUDIO_THEME_COOKIE_MAX_AGE_SECONDS`). Server layouts validate that cookie and
seed both the root HTML and controlled Shell appearance, so reloads/new visits
start with the saved preference without a default-theme hydration swap. System
is saved as System rather than the current OS color. Fixed policy ignores the
cookie and preserves its previous value. Denied cookies degrade to session-only
selection. This cookie is separate from the public site's theme preference and
contains no document content.

The Viewer toolbar offers **Preview theme**. **Follow Studio** is the default;
Light, Dark and System override only the isolated content iframe. System follows
the OS independently of the shell's selected preference. The override lives in the
resource session and survives Viewer/JSON/Preview navigation. It is not persisted
in the global preference cookie. It is not document
content, is not published, and does not reset drafts or undo/redo. Fixed theme
policies hide this control and govern both Studio and the server-rendered preview.

## Reusing the resource example

The Demo record browser consumes `studio/records`, `studio/navigation` and
`studio/workspace` public components. Its schema, field inputs, image resolution,
card renderer, one-to-one page association and publication sequencing remain
code-owned examples. `workspace/demo/records` owns list/detail/preview and record
upload; page-document management is grouped under `workspace/demo/pages/management`.
The memory adapter implements the neutral async update contract; DemoScope imports
its store contract from adapters/contracts rather than the concrete implementation.

Record edits remain draft values until Apply changes succeeds. Switching records
or following an ordinary link asks before discarding unsaved/pending values.
Cancel retains the fields; confirmation proceeds. During saving, fields remain
editable, while the submit action is disabled. Acknowledging an older snapshot
never clears newer edits, and failures retain the draft. The injected adapter,
not the UI, determines whether an acknowledgement is durable. This default memory
example still resets when its module scope is disposed or the document reloads.
Browser history/programmatic navigation beyond guarded actions remains host-owned.

`test/reuse/reading-workspace` is a second consumer with a slash-separated slug,
nested heading and numeric reading duration. It imports only public shared APIs,
uses an asynchronous source/updater, and exercises record layout, manager tabs,
JSON/Preview workspace, draft retention, delayed acknowledgement and failure/retry.
It reuses no Demo component, data schema, copy object or route helper.

## Pages navigation and empty previews

The sidebar **Pages** entry opens `/demo/pages`, including independent published
pages. `/pages` redirects to this same resource list. Nested page editors keep Pages active; Demo record routes keep Demo active.
This is the same in-memory page adapter and association workflow used by Demo
items, not a second page store. Its provider lives above the routed shell, so
switching sidebar entries preserves records, images and associations. Refresh
still resets Demo data.

A blank document or recursively empty layout shows a compact empty state, without
requesting a preview frame. The shared renderer registry determines content
semantics; text, media and visual section surfaces still use actual previews.

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

## Plain Next.js foundation and Studio extensions

Studio uses the same prepared-resource foundation as plain-next, with editor,
workspace, upload and preview extensions. The resource runtime, scoped readers,
Content text-reference support, metadata builder, environment validation, HTTP
helpers and error views live in `src/infra/`.
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
