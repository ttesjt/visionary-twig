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
packages. Editor CSS is separate from public rendering.
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
