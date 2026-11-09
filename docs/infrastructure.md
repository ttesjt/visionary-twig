# Application infrastructure

Start here when adding an app, generating a starter, or changing UI text/configuration.
Root tooling orchestrates; shared packages provide mechanisms; each app owns its
schemas, public defaults and composition. No package selects a private profile or provider.

| Data                                  | Owner                               | Examples                                               |
| ------------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| UI text                               | TextCatalog, per locale             | buttons, accessibility labels, interpolation           |
| Public presentation config            | AppConfig, independent of locale    | branding mode/image, contact destinations, visibility  |
| Environment/framework settings        | app server boundary / Next config   | secrets, connection paths, deployment origin, rewrites |
| Business content                      | domain source / explicit fixture    | projects, artwork, Puck documents, demo records        |
| Code policy / executable capabilities | module constants / composition code | cache TTL, registries, callbacks, adapters             |

Text is not determined just by a string type: an account URL and a project record
are not UI text. AppConfig is public, even when its JSON is outside public/.
Never put secrets or connection instances in either client Provider.

## Five-minute start

```sh
pnpm bootstrap
pnpm dev
pnpm validate
```

Preparation defaults to auto: each existing override independently extends its matching default.
The starters read text overrides from `.local/content/text/<locale>/<namespace>.json`,
configuration from `.local/config/<namespace>.json`, and content from `.local/content/data/<namespace>.json`. Missing files
are allowed; invalid present files fail. Empty `{}` overrides are valid.
Use `--source default` to ignore overrides or strict `--source custom` to require
all declared files. Legacy runtime reads fixed generated imports; namespace Text loads prepared resources through its plan.

## Dependency and lifetime

```text
prepared-data (pure merge; /node filesystem transaction and checks)
    ↑                    ↑
text-catalog          app-config
pure /node /react     pure /node /react
    ↑                    ↑
app schemas + fixed generated imports + explicit AppProviders
```

Preparation is an explicit tooling step. Runtime reads only fixed bundled JSON.
Root Server Layout reads text/config and passes a serializable public projection
to AppProviders. Server Components and metadata use getters directly. Client
components use app-owned typed hooks. This does not turn Server children into
Client Components and does not initialize SQL/cloud connections.

## Browser theme preferences

The plain-next host separately mounts a thin next-themes adapter outside the
prepared-resource Providers. The library owns browser persistence, system changes,
cross-tab synchronization and the early root-attribute script. Shared UI/styles
remain independent of that dependency. A selectable/fixed site policy is distinct
from a user's stored choice. Theme does not become a prepared namespace, require a
theme cookie, or make normally prerendered pages request-rendered. Its takeover
README documents readiness for theme-dependent controls, CSP and no-JS behavior.

## Guides

- [TextCatalog](text-catalog.md): keys, locales, interpolation, examples.
- [AppConfig](app-config.md): schema, overrides, public boundary, combination checks.
- [Providers](providers.md): composition, full source-workspace inventory, lifecycle and extension.
- [Profiles](content-profiles.md): private sources and safe legacy migration.
- [Templates](using-template.md): official generator and independent output validation.

These guides and package/app READMEs are the maintained contract. Build success
alone is not runtime acceptance: starters are also installed in CI mode, prepared,
started in dev/production and requested through HTTP/browser tests.

## App-owned prepared server content

`app-inputs.config.ts` may declare a `prepared` array of neutral
`PreparedDefinition` values in addition to its existing `validate` function.
`app:prepare` and bootstrap resolve these alongside text/config in the same app
transaction; `app:check` checks their freshness. Namespaces must be unique and
cannot replace text/config. Targeted text/config preparation preserves and checks
existing extra artifacts. Apps own their schemas, source paths and server-only
imports; root tooling does not know their domain or load the artifacts into any
public Provider. Generated and local files remain excluded from app creation.
