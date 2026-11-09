# Studio data

Pure TypeScript portable Studio projects. No React, browser I/O, application data, database, or provider dependencies. Callers inject a ContentRegistry and I/O adapters.

A `studio-project` v1 file wraps the unchanged ContentDocument with a declared default locale, all loaded catalogs, non-copy context and optional neutral source/target revision associations. Media remain references. File handles and credentials never belong in the envelope.

`importProject` explicitly accepts this envelope, ContentDocument and registered native Puck Data (hosts may provide the Puck normalization callback). Declared malformed/unknown projects fail without format fallback. Legacy context.copy becomes the explicitly selected language catalog. Embedded variables.copy cannot coexist with project catalogs.

`parseProject` checks a saveable structure. Missing values remain editable/saveable. `projectIssues` reports language/source/node/field information; `preparePublication` validates the declared default and each selected publication language and returns an owned snapshot. No silent language fallback or translation occurs.

Catalog rename updates all loaded languages and references atomically; referenced deletion is rejected. Catalogs may contain structured values. Project history covers authored layout, bindings, catalogs and context. The UI coordinates native Puck edits with this project history; runtime file locations and source/target revision acknowledgements remain outside content undo. Optional portable associations are serialized separately from these runtime handles.

Publication is an injected capability. Save writes the current local file; Save As selects a new local destination. Publication version checks apply to their specific target, independently of the source and local file baseline. No cloud draft/history/rollback or embedded-media archive is implied.

Renderer contracts may declare `mediaSources` for their validated props. `preparePublication` resolves each selected language and collects only those active renderer URLs; unused context strings are not treated as media permissions. Publication targets must validate their own managed object inventory and update access references atomically.

Media inspection uses content-data.collectResolvedMedia on each resolved data tree alone, so valid near-limit documents are not rejected by counting embedded variables twice. Existing raw, context, expanded-tree and SQL target limits still apply.

## Neutral record contracts

`studio-data/records` exports `StudioRecordSource<Row>`, `StudioRecordUpdater<Row>`
and `StudioRecordUpdateResult<Row>`. Sources provide stable immutable client
snapshots and subscriptions; a remote implementation may refresh that cache
asynchronously. Update receives a row snapshot, AbortSignal and the captured saved baseline
(for host-owned revision/fingerprint checks), and returns an
explicit saved/invalid/conflict/not-found/cancelled/unavailable result. A saved
result acknowledges the submitted operation according to that adapter's durability
contract. Providers own validation, identity/version enforcement, authorization
and actual persistence. These contracts contain no SQL dialect, SDK, connection
configuration or memory adapter dependency.
