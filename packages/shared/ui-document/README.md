# @frontend/ui-document

Process versioned UI documents from JSON text or plain objects. The root entry has no I/O, environment reads,
React, Next, Puck runtime or schema-library dependency. All functions are synchronous and
deterministic. Inputs are copied; expected content errors return `{ ok: false, errors }`.

```ts
import { parseDocument, resolveDocument, validateResolvedData } from '@frontend/ui-document';
import type { ContentRegistry } from '@frontend/ui-document';

// puck-adapter supplies real component schemas, binding targets and slot contracts.
declare const registry: ContentRegistry;
declare const rawJson: string;

const parsed = parseDocument(rawJson, registry);
const resolved = resolveDocument(rawJson, registry, {
  context: { request: { siteName: 'Example' } },
});
if (resolved.ok) {
  // Save document, render data. Never save the resolved tree over placeholders/bindings.
  const { document, data, metadata } = resolved.value;
  validateResolvedData(data, registry);
}
```

## Document contract

```json
{
  "documentId": "sample-article",
  "schemaVersion": 1,
  "revision": 1,
  "locale": "en",
  "data": {
    "root": { "props": {} },
    "content": [{ "type": "Heading", "props": { "id": "title", "text": "", "level": 2 } }]
  },
  "variables": { "content": { "title": "Sample article" } },
  "bindings": [{ "nodeId": "title", "targetPath": ["text"], "sourcePath": ["content", "title"] }]
}
```

The envelope supports schemaVersion 1 only. Revision is a positive safe integer; publication
and concurrency belong to the persistence boundary. documentId is independent of route slug.
locale, variables and bindings are optional. Unknown envelope/data/node keys and legacy zones
are rejected. `data` uses the native Puck content/root/props shape with nested slot arrays.
Root props may be omitted. Node/root readOnly metadata accepts boolean maps. `root` is a
reserved node ID. There are no legacy fixtures or speculative migrations.

## Registry boundary

`ContentRegistry.nodes` maps exact component names to `NodeContract`:

- `slots`: explicit, non-overlapping paths relative to props, with optional allowedTypes.
  A declared slot must contain a node array. Business arrays are never inferred as slots.
- `validateProps(props)`: returns path/message issues for final props including Puck id and
  slots. puck-adapter must extend the real content-block schema to accept these fields.
- `isBindingTarget(path)`: approves only schema-declared data properties. Core independently
  prevents binding Puck reserved props, slots, ancestors of slots and descendants of slots.

Root props require validateRootProps unless empty. Supplied validators are trusted code: they
must be pure, must not mutate arguments and must report expected failures as issues. Programmer
exceptions propagate. No component or alternate rendering tree is defined here.

parseDocument checks JSON, envelope and tree structure; it intentionally does not validate
placeholder props or binding destinations. resolveDocument additionally checks all destinations,
resolves bindings on a separate tree, then validates final props. validateResolvedData checks a
standalone final Data object with the same registry. All IDs are unique across registered slots.

## Binding semantics

Paths are non-empty string arrays. Only own object properties and canonical in-bounds array
indices are accessible. `__proto__`, `prototype` and `constructor` segments are forbidden.
`id`, `type`, `puck` and `readOnly` cannot be target props. Source paths must exist; null is
data and only passes if the final schema accepts it. No coercion, interpolation or recursive
variable evaluation occurs. Literal `${...}` strings are preserved.

External context must be a JSON object. Its top-level namespaces must not collide with embedded
variables. Different bindings may not target the same path or overlapping parent/child paths.
Destination parents must exist; a final object key may be absent if the schema permits it.
Bound arrays/objects are copied per destination. Async variable retrieval belongs to the caller.

## Limits and errors

Defaults: 2 MiB UTF-8 JSON, 128 JSON levels, 100,000 values, 10,000 nodes, 32 node levels,
10,000 bindings and 64 segments per path. Override with `options.limits`; positive safe integers
are required and maxJsonDepth may not exceed 512. Limits apply to object inputs, context and
the expanded result as well as JSON text. Plain objects, dense arrays and finite JSON scalars
are accepted; cycles, getters, hidden/symbol properties and non-JSON objects are rejected.

Issues include code, message, absolute path and documentId/nodeId when identifiable. Structural
failures stop at the first issue; final component schema issues are collected across nodes.
Invalid host limits or registry contracts are programmer errors. A successful parse is not
publication validation: save/publish must use resolveDocument and retain its original document.

## Verification and integration status

Public API tests use explicitly synthetic node contracts to verify the standalone package.
Real component/Puck rendering, schema registration and editor behavior are verified in
the puck-adapter and Studio browser suites; the core remains independently usable.
The content core has no styles or CSS hooks.

## Source and Sink

The root exports the ContentSource/ContentSink interfaces and their result types only.
Import adapters explicitly from `@frontend/ui-document/memory` or `@frontend/ui-document/http`.
No adapter is loaded by the pure root entry.

Source.read(key, { signal? }) returns found/rawJson/version, not-found, cancelled, or unavailable.
Sink.save(key, input, { expectedRevision?, expectedEtag?, context?, signal? }) returns saved/version,
conflict/currentVersion?, invalid/errors, cancelled, or unavailable. Version has a positive revision
and optional etag. Content keys are independent of documentId and must be non-empty strings.
Save preconditions require a non-negative safe expectedRevision (0 means create-only) and a
non-empty expectedEtag. Invalid host options throw; expected I/O/content failures use result unions.

Both sinks run resolveDocument before writing and save its original document, retaining bindings
and placeholders. External context is checked but is not embedded in the saved document. The host
must supply the same variable snapshot to subsequent rendering. A successful client-side check is
not a substitute for the persistence endpoint's own validation and authorization.

```ts
import { createMemoryContentStore } from '@frontend/ui-document/memory';

const memory = createMemoryContentStore({ registry });
const saved = await memory.save('sample/overview', rawJson, { expectedRevision: 0 });
const read = await memory.read('sample/overview');
```

Memory storage is instance-local and does not survive restart. It assigns revision 1 on create,
then increments atomically on save, independent of the submitted document's revision. Both
preconditions are checked when provided; stale writes return conflict without mutation. Reads
return immutable strings and independent version objects. This adapter is for development/tests.

## Explicit HTTP protocol

```ts
import { createHttpContentSource, createHttpContentSink } from '@frontend/ui-document/http';

const transport = {
  origin: 'https://content.example.com',
  versionHeaders: { revision: 'x-content-revision', etag: 'etag' },
  timeoutMs: 10_000,
};
const source = createHttpContentSource({
  ...transport,
  endpoint: {
    method: 'GET',
    urlForKey: (key) => `/documents/${encodeURIComponent(key)}`,
    cache: 'no-store',
    credentials: 'omit',
  },
});
const sink = createHttpContentSink({
  ...transport,
  registry,
  endpoint: {
    method: 'PUT',
    urlForKey: (key) => `/documents/${encodeURIComponent(key)}`,
    // Set authentication headers here on a trusted server host, never in editor config.
    preconditionHeaders: { revision: 'x-expected-revision', etag: 'if-match' },
  },
});
```

This is an explicit protocol example; the package assumes no deployed service or endpoint.
GET returns a raw document JSON body, JSON content type and the configured revision header.
The body revision must equal that header. The configured etag header is optional. Full envelope,
node, binding and props validation remains an explicit parseDocument/resolveDocument step.
POST/PUT/PATCH sends the validated raw document as JSON. The server assigns the saved revision
and returns it in the configured response header (204 is supported); no success body is required.
It must enforce supplied conditions and return 409/412 on conflict, optionally with current version
headers. The adapter never invents a saved version or silently drops an unmapped condition.

Methods, URL construction, headers, cache policy, credentials mode, version headers and condition
header names are host-owned configuration. Endpoint omission returns unavailable/unconfigured.
Defaults are no-store, credentials omit, a 10-second deadline and a 2 MiB response cap. timeoutMs
must fit a platform timer (at most 2,147,483,647 ms). maxResponseBytes and document limits are
independent controls. Fetch is injectable; it must honor the supplied request settings. Deadlines
still return deterministically if an injected fetch ignores cancellation.

Each factory accepts one exact trusted HTTP(S) origin. Per-key URLs must remain on that origin;
URL credentials/fragments and automatic redirects are refused. The package never reads global
environment credentials. Treat factory configuration and custom fetch as trusted host code.
Keep credentialed instances on the server. Browser hosts need ordinary same-origin/CORS setup.

The deadline includes body streaming and cancellation is supported before and during requests.
JSON MIME type, UTF-8, byte length, syntax and response versions are checked. 404 is not-found;
other HTTP failures, network failures, deadlines, invalid responses, unsafe endpoints and oversized
responses remain distinct unavailable reasons. Error results omit raw fetch errors and response
bodies. Interrupted writes can have committed remotely; hosts must reread before retrying using
the expected version. There are no automatic retries, caching, Next invalidation or publication
side effects. The production host owns authorization, durable storage and cache refresh.

## Pure editor operations

`reconcileDocumentEdit(document, nextData, registry, options)` retains bindings by
stable node ID and clears bindings for deleted descendants. Native duplicate
operations pass `options.duplicate = { sourceNodeId, targetNodeId }`; the helper
requires fresh IDs and matching subtree structure, then copies every descendant
binding. Changing a bound raw value is rejected. Structurally valid, temporarily
invalid static props can be edited; resolveDocument and Sinks still reject saves
until the actual component schemas pass.

`unbindDocumentField(document, nodeId, targetPath, registry, resolveOptions)`
resolves the current snapshot, copies exactly that bound value into owned raw props
and removes only the selected binding. Both operations are immutable and return
the same structured ContentResult errors as the rest of the core. They import no
editor or React runtime. Native editor history remains the adapter's responsibility.

## Neutral inspection and editing helpers

The `./inspection` entry exposes inspectDocument, owned JSON snapshot helpers, bounded path validation/read/write and existing content-error capture utilities. Inspection reuses the same registered slot traversal as parsing/resolution. writeJsonPath mutates only caller-owned mutable snapshots, such as an inspected document copy; never pass a shared input object. Studio project operations reuse these helpers rather than inventing another binding/tree validator.

NodeContract may optionally declare mediaSources(props), returning URLs actually used by its renderer after validation and resolution. The core neither fetches those URLs nor decides permissions; a host/domain publisher validates its target inventory and access policy.
`inspectDocument(input, registry, options?)` exposes the existing structural parser and registered-slot node index for pure tooling. Bound placeholders remain allowed; use resolveDocument for final props validation.

`inspectResolvedData(data, registry, options?)` validates/indexes the final data tree using its own size budget and returns the registered-slot node index. It does not include the raw document envelope or embedded variables; validateResolvedData delegates to it and returns only data.

`collectResolvedMedia(data, registry, options?)` uses the same bounded final-data inspection and each registered `mediaSources` contract to return deduplicated active URLs. Hosts resolve bindings first. It never recombines raw document variables, fetches media or decides permissions. Studio publication and Puck media inspection share this implementation.

`ContentRegistry.validateData(data)` optionally checks cross-node rules after bindings
and all node/root props validate. It receives the owned resolved tree; it must be pure.
Return `PropsIssue[]` with paths relative to `data`. Resolution and final-data inspection
report them as `invalid-data` with absolute document paths (and document identity when
available). Structural parsing still accepts bound placeholders. Core knows no anchor,
animation, UI or provider semantics; those rules belong to the consuming registry.

## Renderable content inspection

`hasRenderableContent(resolvedData, registry)` validates the final data and returns a
`ContentResult<boolean>`. Resolve bindings first. Each `NodeContract` may declare
`hasOwnContent(props)`: false means the node only arranges its registered children.
All declared slots are still inspected. Omitted callbacks and nonempty validated
root props count as content conservatively. Invalid data stays an error. Custom
backgrounds, separators or intentional spacers should count as content even when
they contain no text; this is a semantic check, not a DOM visibility measurement.
