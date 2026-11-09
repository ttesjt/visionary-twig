# @frontend/prepared-data

Root exports: mergePreparedData / assertSafeData / freezePreparedData. Pure APIs import no Node, Next or application inputs.

/node exports: resolvePrepared / commitPrepared / prepareData / checkPrepared / readPreparedSource / readAppInput / capturePreparedState / assertPreparedBasis. Preparation/checking belongs to CLI or Node tooling, never browser code.

The app owns strict schemas, defaults and explicit contract versions. Validation/freshness errors are fatal and do not choose a different source. Root shared dependencies remain independent of site/apps/adapters. Test with pnpm test from the root; package outputs must be built before consumer tests.

See [infrastructure](../../../docs/infrastructure.md), [text](../../../docs/text-catalog.md), [configuration](../../../docs/app-config.md) and [Providers](../../../docs/providers.md) for complete contracts and executable recipes.

## API and independent use

`mergePreparedData(defaults, overrides)` returns unknown JSON for the owning schema
to validate. Objects merge recursively, arrays/scalars replace. Both inputs reject
prototype-pollution keys and non-JSON/cyclic values. `freezePreparedData` recursively
freezes validated owned JSON, including children of already shallow-frozen schema
outputs (such as Zod `.readonly()`). None of these pure utilities performs I/O.

```ts
import { z } from 'zod';
import { mergePreparedData } from '@frontend/prepared-data';
import {
  resolvePrepared,
  commitPrepared,
  checkPrepared,
  type PreparedDefinition,
} from '@frontend/prepared-data/node';
const schema = z.strictObject({ enabled: z.boolean() });
const definition: PreparedDefinition = {
  namespace: 'settings',
  filename: 'app.json',
  contractVersion: 1,
  async resolve(read, source) {
    const defaults = await read('config/default/app.json');
    const override =
      source === 'default'
        ? undefined
        : await read('.local/config/app.json', { optional: source === 'auto' });
    return schema.parse(override === undefined ? defaults : mergePreparedData(defaults, override));
  },
};
const resolved = await resolvePrepared(absoluteAppRoot, definition, 'default');
await commitPrepared(absoluteAppRoot, [resolved]);
await checkPrepared(absoluteAppRoot, definition);
```

Definitions own JSON contracts and fixed app-relative inputs; the engine records
read hashes, source, explicit contract version and output hash. App roots must be
absolute. Names, directory escapes and symlinks are validated. `PreparedSource` is
`auto | default | custom`; definitions, not the engine, choose input filenames.

`resolvePrepared` has no output writes. `commitPrepared` coordinates one app-wide
lock, independent stage/backup paths and rollback for all supplied artifacts.
`prepareData` combines them for one namespace. `checkPrepared` re-resolves and
rejects changed inputs/artifacts, wrong versions/sources and an active lock.
For cross-namespace validation, capture the generated state **before** reading and
validating the combination, then pass it as the third argument to `commitPrepared`:

```ts
const expected = await capturePreparedState(absoluteAppRoot, definitions);
// Resolve candidates and check unchanged counterparts.
assertPreparedBasis(expected, unchangedCounterparts);
// Validate the combination using exactly those resolved values.
await commitPrepared(absoluteAppRoot, validatedCandidates, expected);
```

Import `capturePreparedState` and `assertPreparedBasis` from `/node`.
The latter binds unchanged resolved values to the snapshot before combination
validation, including when an intervening writer changed then restored a namespace.
The snapshot records hashes or absence for each definition's output and manifest. Commit compares them under the app
lock before staging anything. If another preparation changed the validation basis,
commit rejects, releases its lock and preserves the winner's outputs. Rerun
preparation against the new state; do not blindly retry a stale candidate. Capture
all namespaces that participate in validation, including ones not being replaced.
The guard coordinates preparation writers, not arbitrary edits to source files.

No app/template registry, language keys, provider SDK or framework settings live here.

Run `pnpm --filter @frontend/prepared-data test`. Tests include interrupted
multi-namespace replacement and recovery, not just successful file generation.

## Automatic optional overrides

Preparation defaults to `auto`. Text/config definitions merge each existing override independently; absent locale/config overrides inherit defaults. Empty objects are valid partial overrides, nested objects merge and arrays replace. Invalid JSON, schema errors, unsafe paths and unreadable files fail rather than falling back. Explicit `default` ignores overrides; explicit `custom` retains required-file behavior. Manifests record optional absence as null, so adding or removing an override invalidates freshness even when the resulting value is unchanged. Runtime reads only generated imports.

Definitions may project `additionalFiles(value)` as bounded nested JSON paths.
The canonical artifact and every projected file share the existing app lock,
rollback and directory replacement. Manifests record their hashes; checkPrepared
compares the full file inventory and all bytes, and captured transaction state
also covers nested files and additions. Old single-file definitions keep their
manifest format and ResolvedPrepared structure. resolvePreparedJson is the shared
default/auto/custom source policy; preparedDataRevision supplies a SHA-256 content
identity for generated resource manifests. No application transport is selected.

## Scoped JSON resources

/resource exports JsonResource, schema-inferred deeply readonly JsonReadView and
jsonResourceManifestSchema. Construct from schema-validated namespace/version/value
inputs, then createView(parent?) to inherit disjoint namespaces. Values are owned
and frozen, views remain stable, and missing values or collisions reject.
The resource has no loading, React state or editing API.

/resource/node exports jsonResourcesDefinition for config/content. Declare one
schema, schemaVersion and default/custom path per namespace. The existing preparation
transaction emits prepared.json, each namespace.json and resources.json with per-file
content revisions. Defaults, optional auto overrides, strict custom, freshness and
rollback use the existing preparation engine. Schema behavior changes require a
new schemaVersion. Runtime exposes only registered versioned JSON assets.

### Source conversion and artifact validation

In namespace definitions, schema is the contract for **generated values**. An
optional sourceSchema converts merged raw inputs during preparation only. Share
the artifact schema with the Runtime registry and JsonResource; keep sourceSchema
in the Node preparation declaration.

```ts
const countSchema = z.number().int();
const count = {
  schema: countSchema,
  sourceSchema: z.string().transform(Number),
  schemaVersion: '1',
  defaults: 'resources/count.json',
  custom: '.local/count.json',
};
```

A raw JSON string becomes a generated number. Loading, SSR/HTTP snapshots and
JsonResource validate that number rather than executing the string conversion
again. Without sourceSchema, schema also validates/normalizes source input, as
before. validateJsonArtifact(schema, unknown) validates owned finite JSON and
rejects a parser that changes a prepared value, including silent field stripping,
coercion or non-idempotent transforms. Object key order is immaterial. Put such
conversions in sourceSchema and describe their final shape in schema.

Schema validators must be deterministic and side-effect-free. Defaults are checked
even when custom overrides exist. Each raw default/effective merged candidate is
converted once; check deliberately resolves sources again to verify freshness.

## Generated server import modules

Namespace preparation emits server-imports.ts from the resource manifest. Each entry uses a literal relative JSON import. additionalModules on PreparedDefinition participates in the same lock, rollback, byte hashes and stale inventory checks as JSON. createServerImportMap is a Node-only emitter with bounded JSON paths. Legacy preparation formats emit modules only when their definition requests them.

## Plain-text preparation inputs

Definitions may use `read(relativePath, { format: 'text' })` for Markdown or other
plain text. JSON remains the default. Text uses the same safe paths, content
hashes, optional-absence tracking, transaction and freshness checks; the resolved
artifact is still JSON. Definitions validate their own content and size limits.
