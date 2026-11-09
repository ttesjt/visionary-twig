# Plain Next.js starter

For the takeover guide delivered to a generated app, see [Your Next.js site](template/README.md). It covers editing the homepage, adding a route and preparing content. Template upgrades can target `src/infra/`; site declarations live in `src/site/`.

A Next.js App Router starter with prepared Text, AppConfig and Content resources.
The root prepares main Text, app configuration and base Content together. Local
scopes support page-specific text and content without upward mutation.

From the workspace root:

```sh
pnpm dev --app template-plain-next
pnpm build --app template-plain-next
pnpm test:e2e --app template-plain-next
```

The source workspace uses port 3203 for development and 3223 for browser tests.
Root runners build shared dependencies first. After installation run
`pnpm app:prepare --app template-plain-next` explicitly. Dev/build/typecheck/test
check generated inputs and reject missing, changed or stale output. The root Layout uses Next automatic rendering; default pages can be prerendered,
while request-aware pages can use connection().

The starter ships a tracked `.env.example`; see [Environment variables](template/README.md#environment-variables) for app-local setup and deployment. The site declares server schemas; the server-only infrastructure validates values on use and reports field names without secret values.

## Metadata

Configure the switch and source mappings in `src/site/metadata.ts`. The default source
uses the existing prepared Text/AppConfig and optional `SITE_URL`. Infrastructure
accepts resolved values; it reserves no namespace or key. Root Layout supplies common
metadata, while the homepage explicitly declares its path for canonical/language links.
See [Metadata](../../../docs/metadata.md) for fields, validation, disabling, deployment
and page overrides, or the generated-app [takeover guide](template/README.md#metadata).

Retained capabilities:

- Native HTML on the homepage.
- Persistent theme selection through a host-owned next-themes adapter. Preferences
  survive reloads, follow the system and synchronize across tabs. The early script
  restores the root attribute before hydration. UI_THEME_POLICY still accepts
  selectable, light or dark; see [Theme preferences](template/README.md#theme-preferences).
- Localized 404 and page-error recovery through Next's standard route conventions.
  A root failure uses an independent English fallback without resource Providers
  or dictionary requests. See [Page errors and recovery](template/README.md#page-errors-and-recovery).
- Shared TypeScript, lint, Vitest, Playwright and root development tooling.

Home, metadata and theme read namespace text through
synchronous getters. Metadata is prepared on the server; Root Layout restores the global main snapshot synchronously and ordinary pages
consume their scoped Text readers. Resource loading keeps business SWR unchanged.
The homepage consumes its prepared app setting; Layout also prepares base Content, and it does not
request remote sample settings or send events. Page-specific readers use independent scopes.

Generate an independent workspace through:

```sh
pnpm template:clone --output ../plain-project --templates plain-next
```

The initializer adapts the destination's paths and app metadata. Generated apps
start at apps/plain with development/test ports 3003/3103. Names and locations
can be overridden through the root generator. See ../README.md for that contract.

## Prepared resources

The root Layout prepares the `main` Text namespace, `app` AppConfig and `base`
Content together. It passes server snapshots to `ResourceLayout` before consumers
render. The homepage reads its prepared setting without a browser
resource request. Resource payloads stay outside static client JavaScript.

`src/site/text.ts`, `resource-scopes.ts`, `config-schema.ts` and `content-schemas.ts`
declare languages, namespace membership and validation. The tracked default files
include optional page/section namespaces for hosts to select. Declaring a resource
does not mount a route or automatically add it to an active Provider.

Run `pnpm app:prepare --app template-plain-next` after editing inputs. Preparation
merges optional ignored overrides, validates every declared kind and writes the
generated resource inventories and server imports atomically. Dev/build/check
consume prepared artifacts and reject missing or stale output.

## Scoped resource composition

`src/infra/resources` supplies the pure/client/server composition APIs.
`prepareScopeResources(scope, locale)` and `planResourceScope(scope, locale)` use
the same declared scope. `ResourceScope` starts missing kinds together and gates
only its own subtree. Synchronous readers publish complete immutable views.

Root Layout, Proxy and the locale segment choose one initial language for HTML,
metadata and resource snapshots. Language transitions prepare all mounted Text
scopes before publishing, retaining the current view on failure. Text key and
interpolation contracts derive from the prepared reference dictionary.

See [resource initialization](../../../docs/resource-initialization.md),
[the resource model](../../../docs/resource-model.md) and the
[text package](../../shared/text-catalog/README.md) for public contracts.
