# Public application configuration

`@frontend/app-config` provides a validated reader, Node preparation adapter and
typed React context factory. Every app owns its own schema; there is no giant
cross-app schema. Configuration has no locale dimension.

```text
config.config.ts                 schema and explicit contract version
config/default/app.json          tracked complete neutral presentation config
.local/config/app.json           ignored partial custom override
.generated/config/app.json       fixed ignored runtime input
.generated/config/manifest.json  source/input/output hashes and versions
src/config/schema.ts             one contract; TS type inferred here
src/config/app-config.server.ts  Next server getter
src/config/context.ts            app-owned typed context
src/config/client-config.ts      explicit public client projection
```

## Example and partial overrides

The plain-next starter has `home.showIntroduction` and Studio has `workspace.showIntroduction`. For example,
put `{"home":{"showIntroduction":false}}` in the generated plain-next app's
`.local/config/app.json`, run `pnpm config:prepare --source auto` in that app, and its
introductory paragraph disappears. Keys are app-owned: do not copy a website
configuration into a different starter without adding its schema and consumer.

Objects merge recursively; arrays replace entirely; null is meaningful only when
allowed by the schema. A custom override may introduce a field omitted from the
default object when the schema allows it. Unknown fields still fail. Unsafe JSON
keys and escaping paths/symlinks fail. Shared mechanics live only in prepared-data.

## Add configuration

1. Add the field to the app's strict schema and infer its type there.
2. Add its neutral default, increment the explicit config contract version.
3. Add any cross-reference checks to app-inputs.config.ts's validate hook.
4. Choose server getter or client hook at its consumer; pass only a public projection.
5. Prepare and test default/custom, invalid input and relevant interactions.

```ts
import { createAppConfigReader } from '@frontend/app-config';
// Inside an app loader, generated is a fixed JSON import.
const reader = createAppConfigReader(appConfigSchema, generated);
export const getAppConfig = reader.get;
```

`createAppConfigContext<AppConfig>()` in `/react` supplies AppConfigProvider and
useAppConfig. Instantiate once in app code. Its missing-provider error is explicit.
Configuration is read-only input, not a replacement for preference/editor state.

## Combined checks and secrecy

`app:prepare --app <id> --source custom` resolves and validates all declared systems,
runs app-owned cross-reference checks, then commits the selected artifacts using one lock and
rollback. `app:check` checks actual generated sources independently and validates
their combination. Single-system prepare/check does not silently switch the other
system back to default. Before resolving a combination, preparation snapshots all
generated artifacts and manifests, and binds unchanged resolved values to that
snapshot before combination validation. Commit rechecks that snapshot under the app lock;
if another preparation has changed a participating namespace, it fails without replacing any
output. Rerun against the latest state rather than committing a stale combination.
The validate hook may be synchronous or asynchronous and is always awaited.
dev/build call app:check; installation has no profile side effect.

Do not put secrets, D1/R2 resource settings, connection objects, environment maps,
framework rewrites or business records in AppConfig. Use .env/server integration,
Next configuration or domain storage respectively. A client projection is public;
being outside public/ is not a privacy boundary. Only text/config-generated values
are passed by AppProviders; adapters continue to be selected by app integrations.

Parsed startup inputs are recursively frozen. Schema outputs must remain finite JSON values; functions, class instances and cyclic values fail preparation instead of being silently omitted during JSON serialization. Interactive preference/editor state stays outside these inputs.

## Optional namespace runtime

plain-next uses the same [scope composition](resource-initialization.md#resource-scope-composition) as Text and
Content. config.config.ts declares {version, resources}; each namespace supplies
schema, schemaVersion and explicit default/custom paths. Existing {version, schema}
hosts retain their original preparation shape and reader/context APIs.

For the common case, declare only app with config/default/app.json and
.local/config/app.json. The namespaced adapter still emits .generated/config/app.json,
plus prepared.json, resources.json and manifest.json. It does not import these
payloads into client code. The root Server Layout prepares a resource snapshot;
AppConfigProvider publishes the schema-inferred immutable reader:

```tsx
const config = useAppConfig().get('app');
return config.home.showIntroduction ? <Introduction /> : null;
```

A feature needing additional registered configuration can place a `ResourceScope`
under the Layout's AppConfigProvider. After loading, the Layout reader includes
the new namespace. Mount a nested AppConfigProvider when the feature should own
it locally or receives its own SSR snapshot. Existing configuration is read-only.
Preferences and consent belong in separate state.

A namespace need not be named app, and its paths need not be config/default/app.json.
For example, settings may declare resources/default/settings.json and
.local/settings.json. Workspace source checks require the configuration declaration
and lifecycle commands; app:prepare/check use the format adapter to verify actual
input paths. Legacy single-file Config retains its app.json paths.

For conversions, declare an optional sourceSchema in the namespace preparation
entry and keep schema as the generated-value contract. The Runtime registry uses
only that artifact schema. See [source conversion](../packages/shared/prepared-data/README.md#source-conversion-and-artifact-validation).
