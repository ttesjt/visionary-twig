# @frontend/puck-adapter

Validated Puck registration over ordinary foundation/content-blocks components.

The root exports ContentRender and InvalidContentDocument and uses Puck's explicit
RSC Render entry. It contains no editor/client boundary. `./schema` exports the
pure contentRegistry and schema catalog without React/Puck runtime imports.

Puck is fixed to 0.23.0; Zod uses the content-blocks catalog version 4.6.7.
Native Puck Data has `type + props.id`; nesting uses a required `content` slot on
Container/Row/Column/Grid/ContentSection/MediaText. RichText.content remains ordinary
structured business data, never a slot. All registered names are allowed in slots.
Layer and MediaViewer are not document nodes. Props accept only their strict schemas.

ContentRender resolves and validates before invoking Puck. Invalid documents throw
InvalidContentDocument with structured issues for host error mapping. Content retrieval,
routes, authentication, variable loading, publication and Next cache policy stay in hosts.
No network/file/environment I/O occurs during resolve or render.

The host explicitly loads layout-styles/default.css, styles/default.css and the two
content-blocks.css entries as needed. Public component hooks remain owned by those
packages. Editor CSS is separate from public rendering. See the [Studio template](../../templates/studio) for local editing and isolated RSC previews.
[Host integration](../../../docs/content-runtime.md) describes runtime boundaries.

## Editor entry

Import `ContentEditor` from `@frontend/puck-adapter/editor` in a client host. The
entry preserves its explicit client directive. Pass a raw document (JSON string or
object), optional resolve context/limits, and an injected `onSave(document, signal)`
callback returning ContentSaveResult. The callback owns transport/authentication;
the editor never loads credentials, routes or environment settings. Only the
editor host imports `component-owned CSS/puck-editor.css` and
`@frontend/styles/puck-editor.css`, in addition to the ordinary content and layout
styles. Public render routes do not load this stylesheet.

Puck edits raw native Data. The preview projects resolved business props while
keeping Puck's native slot functions. Bound top-level fields display resolved
values and source paths read-only; a nested binding locks its entire structured
field. An explicit Unbind action copies that binding's current value into raw
props and removes it. Moves retain bindings, duplication maps new subtree IDs,
and deletion removes descendant bindings. Native undo/redo restores the paired
raw document snapshot without reverting the latest server revision.

Finite props use semantic selects, text uses inputs, and structured arrays/objects
use schema-validated JSON fields. Invalid structured drafts block saving and never
enter Puck Data. The editor does not provide arbitrary HTML/style/class fields.
New media blocks start with valid placeholder URLs; hosts must supply resources.
Binding creation, variable management, rich-text toolbars and a media library are
future authoring features; existing bindings are preserved and can be removed.

Saving validates the full document and sends the raw snapshot. The success message
tracks that submitted snapshot; edits made during or after saving remain marked
as unsaved until a subsequent save includes them. Conflicts are shown
without automatic overwrites. A host changing documentId/revision remounts the
session; unmounting aborts an active save. The host must re-read after an ambiguous
interrupted write and provide durable storage, permissions and publication policy.

## Local editor integration

`onSnapshotChange(snapshot)` runs after committed state changes and reports the raw
`document`, structured `issues`, `invalidFieldIds` and `canExport`. Invalid field
drafts remain outside the raw document; consumers must honor `canExport`.
`headerActions(snapshot)` replaces Save actions (return null to hide them).
These client callbacks do not use or alter the `ContentSaveResult` contract.
`sessionKey` explicitly resets native history when replacing an open document,
even when its documentId/revision are unchanged. Keep the initial document stable
between replacements; never feed every snapshot back as a new initial document.

## Host-owned project editing

ContentEditor accepts optional fieldEditor and historyControls to compose a richer host session without knowing about catalogs, storage or apps. The public client `./fields` entry exposes SemanticField, unwrap and the common history shortcut without importing Puck's drag engine. Structured inputs report draft validity through an injected callback. Host project undo preserves component selection, and envelope-only variable updates preserve focused inputs. Standalone native editing and onSave remain supported; saved revisions still notify snapshot consumers.

The pure schema entry exports normalizePuckInput for validated JSON import. Registered NodeContract.mediaSources declares resources actually consumed after prop validation and variable resolution. Publication can collect these URLs without scanning unused context or resolved prose. The RSC renderer and schema entry never import the Studio editor.
The pure `/schema` entry exports collectContentMedia(document, resolveOptions?): it resolves bindings, checks component schemas and returns URLs from registered media fields, including nested slots and video resources. It does not authorize URLs or import editor/rendering code.

## Content presentation extensions

The registry includes Tabs/TabPanel native slots and Separator. Tabs accepts only
TabPanel children. Each panel owns its label/body; no parallel metadata or custom
ID generation is needed. Native Puck owns insertion, moves and duplication. Panel
labels use ordinary bindings. Server HTML exposes every panel and the editor keeps
all native slots visible. Runtime component contracts derive from one catalog.

## Retained native editing

The inline canvas uses a full-width native viewport with iframe rendering disabled.
Its virtual viewport must match that layout, including while a host retains the
engine in a hidden route panel. Hosts can preserve the engine to keep inspector
state without triggering numeric auto-zoom on a zero-sized frame. The editor-only
`ui-puck-canvas-content` root reserves action-bar space via
`--ui-puck-canvas-action-space`, keeping the first node’s actions inside the
scrolling canvas. This wrapper never enters document JSON or public rendering.

Invalid structured field buffers belong to the editor session. Switching selected
nodes or hiding the engine keeps them, and `canExport` remains false even when the
invalid inspector is not visible. Node deletion releases only its own buffers.
`fieldScope` separates buffers for host editing contexts such as languages; include
the current language when injecting localized field editors. Explicit `sessionKey`
replacement clears the engine's buffers. Save/Publish consumers must continue to
honor `invalidFieldIds`/`canExport`; buffers never enter the serialized document.
Native canvas undo restores data and bindings while preserving the current host
variables, locale and acknowledged revision. The save controller independently
owns cancellation and submitted-snapshot acknowledgement.

## JSON navigation and scroll entrances

The rendering registry additionally accepts two composition blocks with native `content`
slots. They are JSON/runtime capabilities; editor fields/defaults are maintained separately.
`documentComponentSchemas`, `DOCUMENT_COMPONENT_NAMES` and `DOCUMENT_SLOT_COMPONENTS`
expose the full runtime inventory. Existing editor inventory exports remain unchanged.

```json
{
  "documentId": "a-study",
  "schemaVersion": 1,
  "revision": 1,
  "data": {
    "root": {},
    "content": [
      {
        "type": "ActionLinks",
        "props": {
          "id": "jump",
          "actions": [
            {
              "id": "details-link",
              "availability": "available",
              "label": "Details",
              "href": "#details"
            }
          ]
        }
      },
      {
        "type": "Anchor",
        "props": {
          "id": "destination-node",
          "name": "details",
          "content": [
            {
              "type": "Reveal",
              "props": {
                "id": "entrance-node",
                "effect": "rise",
                "once": true,
                "content": [
                  { "type": "Heading", "props": { "id": "heading-node", "text": "Details" } }
                ]
              }
            }
          ]
        }
      }
    ]
  }
}
```

`name` is the public DOM destination; `id` remains the Puck binding identity. Names and
links can use normal variable bindings. After resolving them, validation rejects invalid
names, duplicate destinations and fragment links without a declared target, including
links nested in Hero actions or rich text. Same-document links use `#name`; cross-page
links such as `/other#name` are the host's responsibility. Empty/unresolved targets do
not silently render. Put targets outside TabPanel: a tab may be hidden; anchor its parent
Tabs instead. Navigation does not implicitly activate tabs.

`<ContentRender navigationScope="study-a" … />` explicitly namespaces destinations and
local fragment links to `study-a--name` when embedding multiple documents. External and
cross-page URLs and original source data stay unchanged. The default adds no prefix,
so canonical bookmarks stay short. Scopes use the anchor name grammar and cannot contain the reserved `--` separator.
The host supplies a unique scope per embed and keeps
its other DOM IDs distinct from content anchors.

See content-blocks for Reveal presets and layout-styles for global styling. These nodes
need no database migration and no Studio/editor configuration to render.

## JSON ScrollBoundary

`ScrollBoundary` is also a JSON-only runtime node with one native `content` slot.
It uses the same component, schema and state model as ordinary React. The editor
inventory is unchanged.

```json
{
  "schemaVersion": 1,
  "documentId": "boundary-study",
  "revision": 1,
  "variables": { "viewport": { "referenceOffset": 48 } },
  "bindings": [
    {
      "nodeId": "boundary",
      "targetPath": ["offset"],
      "sourcePath": ["viewport", "referenceOffset"]
    }
  ],
  "data": {
    "root": {},
    "content": [
      {
        "type": "ScrollBoundary",
        "props": {
          "id": "boundary",
          "range": "within",
          "offset": 0,
          "content": [{ "type": "Heading", "props": { "id": "title", "text": "A small study" } }]
        }
      }
    ]
  }
}
```

Only `range`, `offset` and `disabled` are serializable behavior props. Runtime state
appears as `data-scroll-boundary-state` and is available to client descendants through
`useScrollBoundaryState()`. JSON does not serialize callbacks, DOM scroll roots or host
integration names. Registry validation rejects such extra props. A consumer may style
or read the state without changing content rendering. Native slot traversal preserves
bindings, nested component validation and media permission inspection. Puck node IDs
continue to be bookkeeping IDs; use an explicit Anchor for public destinations.

## Reading and discovery document nodes

The public document registry also accepts `ContentNavigation` (native `content`
are runtime/schema registrations; the separate Studio/editor inventory is unchanged.

```json
{
  "type": "ContentNavigation",
  "props": {
    "id": "reading",
    "label": "In this project",
    "title": "Paper Atlas",
    "progressLabel": "Reading progress",
    "items": [{ "label": "Process", "href": "#process" }],
    "content": [
      {
        "type": "Anchor",
        "props": { "id": "process-node", "name": "process", "content": [] }
      }
    ]
  }
}
```

Only one reading region is permitted per document. Every destination must declare
an Anchor inside that region, outside TabPanels. The renderer scopes navigation
hrefs and recommendation detailHref fragments along with Anchor names when embedded.
Raw variables/bindings continue to resolve through content-data. Recommendation
media inspection includes only the thumbnail/fallback variants actually displayed
by cards and image badges, not unused originals/context. Empty recommendation
rails do not satisfy publication content-presence requirements.

### Host-owned navigation presentations

`ContentRender` accepts `navigationPresentations`, a pure catalogue from
`@frontend/content-blocks/schema`. For non-default navigation, the host also wraps
the rendered document in the matching client `NavigationPresentationProvider`.
`createContentRegistry({ navigationPresentations })` exposes the same validation
for external resolution/publication. `collectContentMedia(input, {
navigationPresentations, ...resolveOptions })` inspects only the selected parts'
declared resources after variable resolution. An unknown preset without a host
catalogue is invalid.

There is still only one `ContentNavigation` node. Presentation options support
normal document bindings, including nested JSON option paths. Raw variables and
bindings are not rewritten. This runtime extension does not add editor fields or
change the separately maintained Studio inventory.
