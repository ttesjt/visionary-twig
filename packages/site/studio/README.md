# Studio

The package provides a workspace shell, project sessions, source editing,
read-only viewing and optional file/publication controls. Hosts select their
routes, data implementations and CSS. The legacy combined editor remains available.

Import `@frontend/studio/data` to read, edit or validate a project in a server
module or CLI. This entry and `/data/records` load independently of React and
Puck. UI entry points use React and the editor entry integrates with the Puck
adapter. Installing the Studio package still installs its declared dependencies.

## Workspace shell and code-owned extensions

`StudioShell` renders grouped navigation, a sticky header, an accessible mobile
navigation dialog, a page heading and a content area. `createStudioRegistry`
registers ordinary React page components. The shell entry imports no Puck editor,
SQL, storage adapter, application code or website styles. Specialized editors and
business workflows are extensions; registration is not a form-generation schema.

```tsx
import { createStudioRegistry, StudioShell, type StudioPageContext } from '@frontend/studio/shell';

function NotesPage({ navigate }: StudioPageContext) {
  return <MyNotesEditor onDone={() => navigate('overview')} />;
}

const registry = createStudioRegistry({
  groups: [{ id: 'content', label: text.content }],
  pages: [
    { id: 'overview', title: text.overview, group: 'content', component: OverviewPage },
    { id: 'notes', title: text.notes, group: 'content', component: NotesPage },
  ],
});

<StudioShell
  registry={registry}
  activePageId={currentPageId}
  navigation={{ href: pageHref, navigate: navigateToPage }}
  brand={text.brand}
  workspace={text.workspace}
  text={text.chrome}
/>;
```

IDs use kebab-case and remain independent of translated labels and resource IDs.
Groups/pages appear in registration order. Empty registries, duplicate IDs,
missing groups and empty titles fail at registration. Inputs are copied and
frozen so later mutations cannot silently change registered navigation.
Descriptions and React icons are optional. Text comes from the host's validated
dictionary; `studioShellTextCatalogSchema` is available at `./shell/text-catalog`.
The `./shell/registry` entry is editor- and React-runtime-independent.

The host supplies an active ID, real hrefs and navigation. The shell intercepts
ordinary navigation clicks, preserving modified-click URLs. The host owns routing,
deep-link validation, actual 404 responses and browser history. With a persistent
host layout, the shell's selected appearance remains across page transitions.
Fixed `themePolicy` omits appearance controls. Without `appearance`, preferences
are session-local to the mounted shell. To restore persisted preferences or own
the state elsewhere, pass `appearance={{ preference, setPreference }}`. This is a
controlled value: both the topbar and `useStudioTheme().setPreference` notify the
host, which supplies the updated preference. Fixed policies still override it
and suppress change callbacks. Cookie/storage I/O remains in the host; the shared
shell never chooses a persistence mechanism.
`useStudioTheme()` from `./shell` exposes the effective `preference`, `policy` and
`setPreference` to descendants, including focused child routes. It requires a
`StudioShell` ancestor. Resource tools inherit the shell's CSS theme rather than
initializing a second UI theme. Fixed policies also govern requests through this hook.

An isolated iframe cannot inherit CSS: pass the shell preference to `StudioViewer.theme`
by default. Hosts may keep a separate preview override and resolve it through the
same policy; this value affects rendered content only. `StudioViewer.toolbarActions`
accepts host controls for such overrides without coupling the Viewer to a shell or
an application-specific preference model.

Pages receive `page`, `registry` and `navigate`. They own their UI, data, validation,
actions and persistence. The shell does not automatically save or publish a page,
interpret its fields, or supply credentials. `headerActions`/`footer` are host slots.
A client-render failure inside a page is isolated from navigation; retry remounts
that page. Lazy pages use a loading fallback. Hosts using nested routes may put
`StudioPageOutlet` in each route inside the shell; without children, the shell
renders the registered component itself.

The workbench `studioTextCatalogSchema` validates `resolvedValue` as a template
that allows `{label}` interpolation, for example `Resolved {label}`. Binding outputs
use this template for their accessible name; translations can reorder or omit the
field label. Unknown interpolation names are rejected during text preparation.

Hosts explicitly import these independently replaceable global entries:

```ts
import '@frontend/ui/default.css';
import '@frontend/styles/default.css';
import '@frontend/studio/shell.css';
import '@frontend/styles/studio-shell.css';
```

The Studio UI entries provide structural defaults. The shared styles entries select appearance. Public hooks
include `ui-studio-shell`, `ui-studio-sidebar`, `ui-studio-topbar`,
`ui-studio-main`, `ui-studio-page-navigation`, `ui-studio-page-heading`,
`ui-studio-surface`, `ui-studio-flow`, `ui-studio-grid`, `ui-studio-feature`,
`ui-studio-field` and `ui-studio-button`. `[data-emphasis=strong]` and
`[data-variant=primary]` are bounded visual variants. Sidebar/content widths and
spacing are controlled by `--ui-studio-sidebar-width`, `--ui-studio-content-width`
and `--ui-studio-page-inset`. No component stylesheets or authored inline styles
are required. The appearance supports foundation themes, narrow viewports,
reduced motion and forced colors.

Load `@frontend/studio/editor.css` and optional
`@frontend/styles/studio.css` in routes that show the workbench. The shell and
editor can be styled independently and share density defaults. Controls start
at `2rem`, rising to `2.5rem` on narrow screens or coarse pointers. Override
`--ui-studio-control-height`, `--ui-studio-space-content`,
`--ui-studio-space-section`, or `--ui-studio-panel-inset` at the Studio root
to adjust density. Resource tab panels retain their contents when hidden, and
the active panel can scroll within `--ui-studio-resource-panel-max-height`.

## Source editing and viewing

The supported starter workflow uses `./json-editor` and `./viewer` separately.
Keep `useProjectSession`, `useStudioJsonDrafts` and optional `useBrowserProjectFiles`
in one persistent host layout/provider above mode routes. Passing the same session
object to short-lived page components is insufficient if its hook owner unmounts.
`StudioShell layout="focus"` hides chrome while preserving its children and state;
returning to `layout="workspace"` restores navigation.

```tsx
const session = useProjectSession(initialProject);
const drafts = useStudioJsonDrafts(session);
// Render in separate routes or persistent tab panels:
<StudioJsonEditor drafts={drafts} text={text.jsonEditor} />;
<StudioViewer session={session} adapter={previewAdapter} theme={theme} />;
```

The JSON editor selects the raw layout document, all language catalogs or non-copy
context. Text stays staged until Apply. Validate and Format do not mutate the
working project. Apply parses every staged section together through the existing
project protocol and creates one undoable working-copy commit. Malformed input or
schema errors preserve every buffer. If another control changes a drafted section,
Apply reports a conflict; explicit Reset discards only that section after confirmation.
Independent section updates are retained. Apply also refuses to replace unapplied
input owned by another editor; repair that input or explicitly replace the project. Confirmed content replacement resets
buffers by session generation; cancelling replacement preserves them.

`StudioSessionHistory` controls applied project undo/redo. Unapplied drafts block
history, Save and Publish, preventing unnoticed export of earlier content. Hosts
keep the draft controller mounted across route/tab changes. This is an in-memory
working session, not persistence across refresh. Native textarea undo is local to
its mounted source control; project history records Apply and other project edits.

`StudioViewer` automatically requests the validated working copy on opening and
on applied document/catalog/context/locale/theme changes. Draft text never becomes
preview input. Missing dependencies block preview and retain language/source/field
diagnostics; structure-valid incomplete work can still be saved locally. The host
preview adapter returns an isolated render URL, with cancellation and late-response
protection. A manual refresh remains available after failures or expiring snapshots.

The editor has its own optional validated text scope, `./json-editor/text-catalog`, so
existing consumers of `studioTextCatalogSchema` remain compatible. Hosts include its
schema/default JSON in their normal prepared dictionaries. Public style hooks:
`ui-studio-focus-workspace`, `ui-studio-focus-toolbar`, `ui-studio-focus-tabs`,
`ui-studio-focus-panel`, `ui-studio-json-source`, `ui-studio-json-source-input` and
`ui-studio-viewer`. Studio CSS entries provide responsive light/dark appearance.

`StudioPuckEditor` at `./editor` is an experimental interactive canvas, not the
default editor. Basic operations exist; interaction quality is not production-ready.
Hosts must label that limitation and provide a supported source-editing fallback.
The original `StudioEditor` composition and workbench API remain for existing hosts.

## Page-project editor

Reusable, local-first Studio project editor. Hosts supply the component registry through the existing Puck adapter, optional page-preview and publication capabilities, and optional file adapters. This package has no SQL, Cloudflare, app or website-style dependency.

## Project files

The workbench opens complete `studio-project` v1 files, existing ContentDocument files and supported native Puck Data. Unknown versions and invalid declared project files are rejected without format guessing. Existing bindings and embedded variables remain intact. Legacy external copy is normalized into the explicitly selected language catalog by the import/data layer.

A complete working file contains metadata, the original document, every loaded language catalog, non-copy context and optional neutral source/target associations. `context.copy` is constructed only for the selected preview language. Media bodies, file handles and credentials are not embedded.

## Local Save and Save As

Save writes a complete project to the current writable file location. Save As selects a location, writes the captured snapshot and remembers that location. A remotely opened project has no local writable location, so its first Save uses Save As. Save As retains publication associations and does not create a remote resource.

The default browser adapter uses file-system picker handles where available. A plain file input grants no writable handle. Environments without native save support use an explicit download fallback, which reports **download started**, retains no invented location, and does not mark the original file saved. Hosts may inject `StudioFileAdapter` for another environment; `StudioFileLocation.write` resolves only after the exact snapshot is durably written according to that host's file contract. The legacy `exportFile` prop remains a download-adapter convenience; resolving it is not a durable-save acknowledgement.

Structure-valid projects with missing variables or translations remain saveable. Unapplied/malformed visible JSON drafts block Save to avoid silently exporting an earlier value. Local saved and published baselines are independent. Edits during either operation remain dirty relative to the submitted snapshot; obsolete loads inspect the latest session before requesting replacement.

## Catalogs, bindings and history

The catalog panel imports, creates and edits language dictionaries, switches editing language, declares a default language, displays missing values and references, and renames/deletes keys. Renaming updates every loaded language and referencing binding in one operation; deleting referenced keys is blocked. Shared-key edits affect every referencing field. Values may be text or structured JSON; the user explicitly chooses keys rather than deriving them from prose.

Puck fields support direct values and explicit variable paths. Existing bound fields edit their actual source (catalog, embedded variables or other context); switching to direct freezes the current value and warns that it no longer follows languages. Registered schemas validate binding targets and structured values. Missing dependencies report language, namespace, node and field. No translation or fallback is silently fabricated.

Layout, bindings, catalogs and context share project undo/redo and keyboard shortcuts. Puck retains native insertion, nesting, drag, duplication and deletion. Selection survives binding/history updates; embedded source edits update without remounting the focused input. File locations and publication acknowledgements remain outside content history.

## Explicit publication

Pass optional `publishing: StudioPublishing`. The host supplies target descriptors and list/load/publish functions. Without this prop the workbench operates independently as a local file editor, including in the neutral Studio template.

Publish requires an explicit target/key and selected languages including the declared default. A confirmation names the target. The adapter receives an owned, validated snapshot with raw bindings, selected catalogs and media URLs declared by actual renderers. Save does not call it. Source versions never substitute for another target's expected version. Successful Publish updates only its own baseline and target revision; it does not mark the local file saved.

The host owns provider selection, authentication, storage, business association and atomic publication. No cloud drafts, version-history UI, rollback or offline media archive is implied.

## Preview and host configuration

`previewAdapter` receives raw document plus current-language context and theme, and returns an isolated page URL or issues. Legacy refresh requests are explicit; StudioViewer also refreshes automatically.
Requests are cancellable and bound to the current session and snapshot. Stale frames are labelled; width presets use the actual iframe viewport. Server preview and its access/TTL policy remain host-owned.

`text` supplies validated interface labels, using `studioTextCatalogSchema` from `./text-catalog`. App dictionary preparation is separate from per-project catalogs. `themePolicy` uses the public fixed/selectable foundation policy. CSS is selected by the host: foundation layout/default appearance or an explicit website skin. The generic package imports neither.

Public hooks include `ui-studio-workbench`, `ui-studio-actions`, `ui-studio-catalog`, `ui-studio-catalog-grid`, `ui-studio-key-list`, `ui-studio-key-editor`, `ui-studio-binding-field`, `ui-studio-publication`, `ui-studio-dependencies`, `ui-studio-json-panel` and the existing preview/identity/status hooks.

Use as publication target reads/links the selected target revision without replacing the current project. This supports publishing a local file over an existing target after explicit selection. It does not publish or claim the local content matches the target; later concurrent changes still produce a conflict.

## Composable editing

Use the independent public entries when a resource page owns its workflow:

| Entry           | Responsibility                                                                   |
| --------------- | -------------------------------------------------------------------------------- |
| `./shell`       | Registration, navigation and page containers                                     |
| `./session`     | `useProjectSession`, `StudioTextCatalogProvider`, `StudioReplacementDialog`      |
| `./editor`      | Legacy `StudioEditor` composition and experimental `StudioPuckEditor`            |
| `./catalog`     | Standalone `StudioCatalogPanel`, without importing the interactive canvas        |
| `./json-editor` | Staged JSON controller/editor and working-copy history actions                   |
| `./viewer`      | Automatically refreshed, isolated Viewer of the applied project                  |
| `./files`       | Optional local file controller, browser adapter, file toolbar and catalog import |
| `./publishing`  | Optional injected publication controller and controls                            |

`StudioEditor` accepts a caller-owned `session`. It creates no file picker,
record list, database connection, load/save request or publisher. A resource page
can render its own controls around it. Optional `catalogActions` lets a host add
file import; without that slot, catalog editing is entirely in-memory.
`StudioTextCatalogProvider` supplies the same validated text to these components. The
host owns theme selection and CSS, and passes its theme to previews.

`useProjectSession(initialProject?)` owns one portable project's history,
raw layout/bindings, language catalogs, context, current locale, validation,
unapplied drafts and replacement confirmation. It performs no persistence I/O
and holds no file handles. The initial project is read once; use `open` or
`requestReplace` for later selections, and render `StudioReplacementDialog`.
`open` parses/normalizes supplied data; `requestReplace` accepts an already
validated project. Both inspect the latest dirty state. `open` returns a reserved
session generation, or `false` on invalid input. A reserved generation is not
necessarily active until replacement is confirmed; cancelled generations are
never reused. `filename` is a suggested export label, not a file path or handle.

Resource pages own asynchronous reads, cancellation and identity checks before
passing results to the session. For saves, capture `session.latest.current` and
persist that exact project's snapshot. Only after success call
`acknowledgeSave(snapshot, generation)`; newer edits retain `flags.needsSave` and a completion
for an old session is ignored. `acknowledgePublication(snapshot, generation,
target)` independently acknowledges publication and its optimistic target version.
A resource does not have to implement publication. `saved: true` on opening a
complete project establishes an existing save baseline, regardless of storage
provider. Opening a raw layout alone never claims its complete project is saved.

`useProjectFiles` owns writable handles and binds them to the reserved session
identity; cancelling a replacement cannot attach its handle to a later project.
`useBrowserProjectFiles` supplies the browser adapter with SSR-safe capability
detection. Download fallback is still distinct from confirmed durable saving.
Remote list/load/publish orchestration remains in the optional `./publishing`
entry and never runs just because an editor is mounted.

The original `StudioWorkbench` remains a compatibility composition of these same
parts, including optional injected publishing. The Studio template's Demo Pages routes compose these capabilities with memory-backed publication and host-owned item association; there is no standalone `/editor` route in that starter.

A resource-owned save can be as small as:

```tsx
const session = useProjectSession(initialProject);
async function saveResource() {
  const { project, state } = session.latest.current;
  await resource.save(project); // The page supplies this implementation and handles errors.
  session.acknowledgeSave(project, state.generation);
}
// <StudioTextCatalogProvider text={preparedText}>
//   <YourResourceActions onSave={saveResource} />
//   <StudioEditor session={session} />
//   <StudioReplacementDialog session={session} />
// </StudioTextCatalogProvider>
```

Replacement confirmation and browser `beforeunload` protect the active session.
The host remains responsible for guarding its own in-app navigation and for
ignoring late read results from a previous resource selection. Saving a resource
draft and publishing a public snapshot are separate operations and baselines.

Resource-page composition may use the optional shell style hooks
`ui-studio-record-browser`, `ui-studio-table-scroll`, `ui-studio-record-table`,
`ui-studio-record-link`, `ui-studio-record-card`, `ui-studio-record-image`,
`ui-studio-record-content` and `ui-studio-notice`. Table selection uses
`data-selected`. These are neutral layout/appearance hooks, not a database UI
contract; page code owns the table columns, form schema and preview component.

## Host-owned nested routes

A registry entry may use `rendering: 'route'` instead of a `component`. It still
supplies the sidebar identity, title, description, group and icon. The host passes
its router's content as `StudioShell` children and resolves all child URLs to the
same active entry. `StudioPageOutlet` is only for component-owned entries; it
rejects a route-owned entry without route content.

Pass `contentKey` when the child content changes without changing activePageId.
This restores main focus and resets a failed child boundary while preserving
healthy nested layouts and their state. The key is router-neutral; the shared
package imports no Next APIs. Clicking an active sidebar entry still invokes the
host navigation callback, allowing a child page to return to its module root.

## Host-owned project identity and publication actions

`useProjectSession(initialProject, { associations: 'host', published: true })`
lets a resource retain its neutral source/target metadata when opening files,
applying complete project JSON or replacing content. Default `associations: 'file'`
keeps portable-file behavior for existing consumers. The host policy is also
reapplied when a pending replacement is confirmed, using the latest target revision.
A remapped file is not acknowledged as saved because its serialized metadata differs.
The `published` option establishes only the initial publication baseline; it does
not acknowledge a local file save. Actual resource IDs and associations remain
host-owned and must never be trusted from an imported file.

`StudioPublishAction` from `./publishing` supplies controlled confirmation,
disabled/busy handling, target summary and status rendering. The host supplies
`onPublish`; this component performs no validation, storage or binding operation.
`StudioPublishingControls` reuses it for the existing injected-target workflow.
`StudioFileControls` remains the reusable Open/Save/Save As composition and accepts
an optional `heading` slot for embedding in a resource page.

## Compact resource composition

`studio/files` exports `StudioSaveActions`, `StudioOpenActions`,
`StudioFileStatus`, `StudioFileIdentity` and `StudioThemeControl`. They consume the
same caller-owned session/file controller and translated Studio text. A host can
keep local Save/Save As in a toolbar and place imports, file identity and theme
preferences elsewhere. `StudioFileControls` retains its existing combined layout
as a compatibility composition of these same parts. No duplicated persistence
logic or additional session is created.

`studio/editor` also exports `StudioCatalogPanel`. Set
`<StudioEditor catalogPanel={null} ... />` when placing that panel in host tabs;
undefined retains the default built-in panel. Keep tab contents mounted when
hiding them, so unapplied field drafts continue blocking save/publication and
catalog editing keeps its working state. The standalone catalog retains shared
keyboard undo/redo through the same session history as the editor.

`StudioPublishAction` renders its optional status only when supplied. Hosts that
render their own operation status can omit it; the trigger still exposes pending
state and disabled behavior. The resource continues owning snapshot validation,
confirmation summary and publication I/O.

`StudioShell.pageHeading` is an optional React node: undefined shows registered
metadata, null omits the repeated heading, and a node supplies host-specific
content. Navigation, error boundaries and route content lifetime stay unchanged.

## Resource workspaces and record updates

`./records` exposes `StudioRecordWorkspace` (list/inspector/preview slots),
`StudioRecordTable` (host-supplied identity and column renderers),
`StudioRecordInspector`, and `StudioRecordPreview`. These components know no
schema, website card, provider or route. Record fields and the actual preview
remain host components. Tables render the supplied snapshot; filtering, remote
querying and pagination remain host responsibilities.

`useStudioRecordSession({ initial, adapter, validate, identity, fingerprint })`
uses the neutral `StudioRecordUpdater<Row>` contract from `studio/data/records`.
The adapter receives a cloned validated snapshot, AbortSignal and captured saved
baseline (for host-defined optimistic concurrency checks), and returns a
saved row or an explicit invalid/conflict/not-found/cancelled/unavailable result.
Only a successful acknowledgement advances the baseline. New edits made during
a write remain dirty; failed writes retain the draft for retry. A duplicate
submission is ignored while pending. Unmount aborts the request and ignores late
acknowledgements. Identity-changing or invalid returned rows cannot mark a draft
saved. Initial values are read once. After a confirmed resource switch,
`open(nextRecord)` aborts the previous operation and resets its baseline while
keeping the surrounding table mounted. Keyed resource components are also supported. Record values must be structured-cloneable and are edited immutably.
The fingerprint defines editable equality, excluding host-managed references.

`./workspace` exposes `StudioResourceManager` with back/name/action/status slots
and keyed content tabs, `StudioSourceWorkspace` with source/preview slots and a
compact toolbar, and `StudioFocusToolbar`. Tab contents stay mounted. The source
workspace accepts the independent JSON Editor and Viewer rather than constructing
another session or choosing any transport. Hosts own resource reads, routing,
publication, association cardinality and all content.

`./navigation` exposes `useStudioNavigationGuard` and `StudioDiscardDialog`.
Call `guard.request(action)` for row selection or programmatic transitions.
When dirty, the action waits for confirmation; Cancel preserves the current
session. An injected `navigate` callback allows ordinary anchor interception;
`allow(URL)` identifies routes sharing the same working session. Modified clicks,
new-tab/download links and same-document anchors retain browser behavior.
Unload protection exists only while needed. Routers must integrate any additional
programmatic/history navigation themselves; cancellation of a write cannot undo
an operation already committed by a remote service.

Discard dialog labels use `studioDiscardTextSchema` at `./navigation/text-catalog` so
host dictionaries can be validated during normal text preparation. This entry
is independent of component engines and server adapters.

### Page workspace lifetime

`useStudioPageWorkspace` from `studio/workspace` composes the existing project
session, browser file adapter and staged JSON drafts. Mount it above Viewer,
JSON and experimental Puck routes; changing modes then retains history, drafts
and file handles. Publication, routing and resource identity remain host-owned.
The separate `session` entry stays independent of file/publication transports.

`studio/viewer` exports `useStudioViewerTheme` and
`StudioViewerThemeControl`: Viewer follows the supplied global preference by
default, while an explicit override only affects the rendered preview. Fixed
policies override both. The host provides labels and persists global appearance.

### Empty page Viewer

Viewer resolves the applied working document before inspecting renderer content
semantics. Empty documents and recursively empty structural layouts show the
translated `previewEmpty` / `previewEmptyHelp` state instead of requesting a tall,
blank iframe. Unapplied JSON stays separate. Invalid content retains validation
feedback; actual visual content, including section surfaces, uses the real preview
adapter as before. Preview requests are cancelled when a document becomes empty.

### Catalog draft and import protection

Unfinished catalog JSON keeps language, key, value-mode and import transitions
disabled until the value is repaired. Catalog keys retain real button semantics
inside a semantic list. A catalog file import captures its destination language
and catalog baseline, ignores older selections and replaced sessions, and rejects
an overwrite if the destination or pending editor input changed during the read.
The current working copy is preserved on conflict; choosing the file again retries
against the new baseline. StudioPuckEditor supplies the session language as the
native field draft scope.

Host-specific document policies can be passed as `registry` in
`useProjectSession` or `useStudioPageWorkspace` options. That registry is retained
on the session and used for import, JSON application, binding/catalog operations,
Puck snapshots, Viewer validation and publication preparation. Omitting it keeps
the neutral default; hosts own any presentation providers and actual rendering.

## Document format and data API

`@frontend/studio/data` provides portable Studio projects in TypeScript. No React, browser I/O, application data, database, or provider dependencies. Callers inject a ContentRegistry and I/O adapters.

A `studio-project` v1 file wraps the unchanged ContentDocument with a declared default locale, all loaded catalogs, non-copy context and optional neutral source/target revision associations. Media remain references. File handles and credentials never belong in the envelope.

`importProject` explicitly accepts this envelope, ContentDocument and registered native Puck Data (hosts may provide the Puck normalization callback). Declared malformed/unknown projects fail without format fallback. Legacy context.copy becomes the explicitly selected language catalog. Embedded variables.copy cannot coexist with project catalogs.

`parseProject` checks a saveable structure. Missing values remain editable/saveable. `projectIssues` reports language/source/node/field information; `preparePublication` validates the declared default and each selected publication language and returns an owned snapshot. No silent language fallback or translation occurs.

Catalog rename updates all loaded languages and references atomically; referenced deletion is rejected. Catalogs may contain structured values. Project history covers authored layout, bindings, catalogs and context. The UI coordinates native Puck edits with this project history; runtime file locations and source/target revision acknowledgements remain outside content undo. Optional portable associations are serialized separately from these runtime handles.

Publication is an injected capability. Save writes the current local file; Save As selects a new local destination. Publication version checks apply to their specific target, independently of the source and local file baseline. No cloud draft/history/rollback or embedded-media archive is implied.

Renderer contracts may declare `mediaSources` for their validated props. `preparePublication` resolves each selected language and collects only those active renderer URLs; unused context strings are not treated as media permissions. Publication targets must validate their own managed object inventory and update access references atomically.

Media inspection uses ui-document.collectResolvedMedia on each resolved data tree alone, so valid near-limit documents are not rejected by counting embedded variables twice. Raw, context and expanded-tree limits still apply. Publication adapters enforce their own storage limits.

### Neutral record contracts

`studio/data/records` exports `StudioRecordSource<Row>`, `StudioRecordUpdater<Row>`
and `StudioRecordUpdateResult<Row>`. Sources provide stable immutable client
snapshots and subscriptions; a remote implementation may refresh that cache
asynchronously. Update receives a row snapshot, AbortSignal and the captured saved baseline
(for host-owned revision/fingerprint checks), and returns an
explicit saved/invalid/conflict/not-found/cancelled/unavailable result. A saved
result acknowledges the submitted operation according to that adapter's durability
contract. Providers own validation, identity/version enforcement, authorization
and actual persistence. These contracts contain no SQL dialect, SDK, connection
configuration or memory adapter dependency.
