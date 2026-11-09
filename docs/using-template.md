# Generate a frontend workspace

Use the current shared packages and runnable templates; historical template tags
record provenance only. Source templates live in packages/templates, shared
runtime packages in packages/shared, and website-specific code in packages/site.

```sh
pnpm install --frozen-lockfile
pnpm app:prepare --all --include-templates --source default
pnpm dev --app template-plain-next
pnpm template:clone --output ../new-project --name @example/frontend
```

The generator selects plain-next and studio by default. Use `--templates plain-next` or
`--templates studio` for a single host. Rename a selected app with `--app studio=editor`. --name changes the root name and all internal package
scopes consistently. Use --list for available templates and --help for options.
Existing output directories are refused.

All source app templates can be edited, typechecked and built at their current
location. The root development runners prepare shared dist and watch packages.
Before pnpm build directly in a template, run pnpm build:packages once. The
node-library scaffold remains inactive and can be selected explicitly for output.

## Ownership and generation

The generator selects templates and dependencies, computes package/path mappings,
copies source, orders initialization, merges root scripts/versions, installs once,
and validates. Each template owns its framework-specific configuration and hook;
shared JSON/path operations live in the generator. Ordinary shared packages have
no mandatory hook. See [the contract](../packages/templates/README.md).

Only the selected templates and transitive shared dependencies enter the new
workspace. Source configs work in packages/templates; initialization updates them
for apps/<id>. Cross-package source/tests resolve public package exports. Final
outputs omit template metadata/hooks, generator code, current site apps/packages,
Git, local environment files and previous build outputs. Root tools and CI are
self-contained. A seed lockfile retains tested resolutions for actual output
importers; the one initial install explicitly allows lockfile reconciliation for final manifests, catalogs and new hook requirements, including under CI=true. Verification subsequently checks a frozen reinstall.

Default generation installs, prepares inputs for selected starters that declare them, and runs pnpm validate. --browser adds Chromium and
fixed light/dark checks. --offline requires a populated pnpm store. --no-verify
installs without validation; --no-install creates source without either step.
After generation use the root dev commands listed in the new README. Hosts choose
CSS and own content, theme policy, storage and access. Studio is a local tool;
cloud access and publication need their own host integration.

## Verification

pnpm test:templates runs source template production tests and fixed themes, then
uses the public generator to create a fresh renamed workspace, install, validate,
run production browser/theme tests and check a frozen reinstall. --source-only
and --clone-only run one phase. Failure artifacts remain under the ignored
.cache/template-verification directory. CI verifies the framework and source templates without consuming apps.

New framework templates supply their own initialization knowledge and declare
root requirements. The current catalog supplies Next.js hosts; Vite is not yet
implemented. Preserve source and generated tests when extending workspace kinds.

Starters using TextCatalog/AppConfig own neutral JSON defaults and their own schemas. For source-only
clones (`--no-install`), run `pnpm install`, `pnpm app:prepare --all --include-templates --source default`, then
`pnpm validate`. Application dev/build checks require fresh generated catalogs.
Text preparation commands are mapped by the template initializer; they work inside renamed
apps as well as at the generated root. Custom files under `.local/content` and
prepared `.generated` output are excluded from all cloning.

## Plain Next.js starter

Select `--templates plain-next` for a welcome page with prepared Text, AppConfig and Content Providers. Shared styles/UI, theme policy, SWR data
reading and explicit event tracking remain. All owned UI and metadata use namespace Text; only offline startup diagnostics are independent.

```sh
pnpm template:clone --output ../plain-project --templates plain-next
pnpm dev --app template-plain-next
```

The source workspace uses ports 3203/3223; a generated app defaults to apps/plain
with ports 3003/3103. The Layout supplies all three resource readers. See
[resource scope composition](resource-initialization.md#resource-scope-composition) for lazy loading
and [server preparation](resource-initialization.md#server-preparation-and-props-snapshots) for page-specific SSR snapshots. Bootstrap also skips input
preparation when none is declared.
