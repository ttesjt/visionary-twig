# Create and extend a workspace

Install this source repository with its pinned Node/pnpm versions. Generate into a
new external directory; use the source commands again when adding another app.
Normal operation of generated projects never needs this checkout.

```sh
pnpm install --frozen-lockfile
pnpm repo:clone --output ../my-site
pnpm repo:clone --output ../bare --bare --name @example/framework
pnpm repo:clone --output ../workbench --template studio --app-name editor
pnpm template:clone --target ../my-site --name editor --template studio
```

Frontend generation includes all shared capabilities and empty site/adapter layers. Default
mode adds plain-next in apps/web; --bare omits apps. Each app is one independent
commit after the framework baseline. template:clone requires --name and preserves
existing app/package source, README, ignored custom data and default-app selection.
Existing destinations are refused. New apps receive unused workspace ports.

Use --offline only with a populated store. Default creation reconciles/validates
frozen installation, explicitly prepares defaults and runs validate. --browser adds
production/fixed-theme acceptance. --no-verify skips aggregate validation, not
installation or preparation. No source environment/token files are copied.

## Generate a Node workspace

```sh
pnpm repo:clone --preset node --output ../tools --name @example/tools
cd ../tools
pnpm build
pnpm test
pnpm validate
```

The Node preset starts with `packages/example-library`, Node tooling and a
single lockfile. Its README and docs explain package development and validation.
Use a frontend workspace for app-template additions.

To start with a library inside the frontend framework workspace, use:

```sh
pnpm library:clone --output ../tools --name @example/tools
```

## Develop a generated frontend workspace

Enter your project and follow its README and docs/commands.md:

```sh
pnpm bootstrap --source default
pnpm dev --app web
pnpm build --all
pnpm validate
```

Set local Text/AppConfig/Content overrides using the app README, then explicitly
prepare with auto/custom. .local and .generated remain ignored. Starter infra is
under src/infra and editable declarations under src/site; examples may be replaced
without understanding every infrastructure module.

For source template development, use pnpm bootstrap --include-templates --source
default, pnpm dev --app template-plain-next or template-studio, pnpm validate and
pnpm test:templates. Source templates have their own ports/identities and are not
runtime dependencies. See [generation](generation.md), [commands](commands.md) and
[template recipes](../../packages/templates/README.md).
