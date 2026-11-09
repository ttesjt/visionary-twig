# @frontend/app-config

Root exports: createAppConfigReader. Pure APIs import no Node, Next or application inputs.

/node exports: appConfigDefinition / prepareAppConfig / checkPreparedAppConfig / AppConfiguration. Preparation/checking belongs to CLI or Node tooling, never browser code.

/react exports the typed context factory. Instantiate once in an app module; supply validated public values explicitly. Required app contexts throw when omitted. React entry imports no Node/Next/adapters.

The app owns strict schemas, defaults and explicit contract versions. Validation/freshness errors are fatal and do not choose a different source. Root shared dependencies remain independent of site/apps/adapters. Test with pnpm test from the root; package outputs must be built before consumer tests.

See [infrastructure](../../../docs/infrastructure.md), [text](../../../docs/text-catalog.md), [configuration](../../../docs/app-config.md) and [Providers](../../../docs/providers.md) for complete contracts and executable recipes.

## Standalone reader and preparation

```ts
import { z } from 'zod';
import { createAppConfigReader } from '@frontend/app-config';
const schema = z.strictObject({ version: z.literal(1), showIntroduction: z.boolean() });
const reader = createAppConfigReader(schema, { version: 1, showIntroduction: true });
const configuration = reader.get();
```

`createAppConfigReader<S>(schema, unknown).get()` returns `z.output<S>` from a
validated, frozen, JSON-only value. It has no environment/profile/locale logic.
Invalid input or non-JSON schema output throws before exposure.

```ts
import { prepareAppConfig, checkPreparedAppConfig } from '@frontend/app-config/node';
const contract = { version: 1, schema };
await prepareAppConfig(absoluteAppRoot, contract, 'default');
await checkPreparedAppConfig(absoluteAppRoot, contract);
```

The Node adapter reads `config/default/app.json`; explicit custom requires
`.local/config/app.json`. It merges objects, replaces arrays and validates through
the app's schema before writing `.generated/config/app.json` and manifest. It
never prepares or selects TextCatalog. Missing/stale/invalid sources throw;
failed preparation preserves prior valid output.

React: `createAppConfigContext<T>()` returns AppConfigProvider and useAppConfig.
Instantiate once; Provider takes `{value:T, children}`, hook returns T or throws
when absent. Inputs are already validated public values, never credentials or
connection instances. Run `pnpm --filter @frontend/app-config test` after dependency builds.

## Automatic optional overrides

Preparation defaults to `auto`. Text/config definitions merge each existing override independently; absent locale/config overrides inherit defaults. Empty objects are valid partial overrides, nested objects merge and arrays replace. Invalid JSON, schema errors, unsafe paths and unreadable files fail rather than falling back. Explicit `default` ignores overrides; explicit `custom` retains required-file behavior. Manifests record optional absence as null, so adding or removing an override invalidates freshness even when the resulting value is unchanged. Runtime reads only generated imports.

## Optional resource delivery

appConfigDefinition also accepts {version, resources} for opt-in scoped config.
Each resource declares schema, schemaVersion, defaults and custom paths, using
@frontend/prepared-data/resource/node. Existing {version, schema} applications
keep their single app.json preparation format. The resource format also emits
app.json, with prepared.json and per-resource revision metadata. Runtime can use
JsonResource for typed, immutable namespace reads and inherited views.
