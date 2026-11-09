# Content runtime integration

The runtime combines pure ui-document processing with the schema registry,
server renderer and client editor in puck-adapter. ContentDocument retains native
Puck Data inside a versioned envelope. Resolve works on a separate tree; raw
variables, bindings, stable IDs and revision remain in the document.

## Rendering and persistence

The host loads the document/context, validates a snapshot and calls ContentRender.
Use one snapshot for metadata and body. Missing content, structured validation
issues and source failures need explicit host states. The host owns durable
storage, permissions, publication and cache policy.

The optional ContentEditor onSave callback remains a client-owned adapter returning
ContentSaveResult. Save validates and submits raw data, supports cancellation and
conflicts, and acknowledges only the submitted snapshot when edits continue.
ContentSource/ContentSink HTTP and memory adapters remain independent ui-document
entries. The host must explicitly configure production persistence.

## Local authoring

The workbench consumes editor snapshot notifications, never a fake Save result.
Local download does not increment revision or publish. Context is exported separately.
The RSC preview uses bounded short-term server memory with no-store/noindex; it is
not a Source/Sink, draft persistence or a filesystem browser.

## Styles and verification

Hosts explicitly select foundation/content CSS. Only the Studio workbench loads
puck-editor.css; public rendering and isolated previews never load editor CSS.
The schema entry is independent of React/Puck runtime.

Run pnpm validate and the Studio production Chromium target documented in its README.
Tests cover protocol/transport boundaries, native slots/actions/history, bindings,
invalid drafts, local export/reopen, same-session cancellation and RSC/CSS isolation.
