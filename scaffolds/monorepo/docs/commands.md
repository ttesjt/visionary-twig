# Project commands

Run these at this project's root. Use the Node/pnpm versions in package.json and
one root lockfile. App IDs are directory names; package scopes do not affect them.

## First install and preparation

```sh
pnpm install --frozen-lockfile
pnpm bootstrap --source default
pnpm apps:list
```

bootstrap installs frozen dependencies, builds the selected host dependencies and
prepares declared Text/AppConfig/Content. With no apps, installation still works.
For local development, auto uses optional per-file .local overrides; custom requires
every declared override; default explicitly ignores private overrides. Preparation
is deliberate and never selects SQL/media sources or performs a cloud migration.

```sh
pnpm app:prepare --app web --source default
pnpm app:prepare --app web --source auto
pnpm app:check --app web
```

The kind-specific text/config/content :prepare and :check commands are also
available. Checks are read-only; dev/build do not silently regenerate stale inputs.
Never commit .local or .generated. See [resource preparation](text-catalog.md).

## Develop, build and verify

| Command                         | Behavior                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| pnpm dev --app <id>             | Build/watch dependencies and start one app                                                             |
| pnpm start --app <id>           | Start its existing production output                                                                   |
| pnpm build --all                | Build actual host dependencies and all apps                                                            |
| pnpm build:packages             | Check source policy and build all libraries, including a bare workspace                                |
| pnpm check:workspace --source   | Source/manifests without dist                                                                          |
| pnpm check:workspace            | Also check emitted exports                                                                             |
| pnpm validate                   | Build libraries once, check prepared inputs/exports/format/lint/types, run tests and build actual apps |
| pnpm test / pnpm test:tooling   | Package behavior / portable root-tool regressions                                                      |
| pnpm test:e2e --app <id>        | Production build and app browser acceptance                                                            |
| pnpm test:e2e:theme-policy      | Fixed light/dark browser acceptance for apps                                                           |
| pnpm format / pnpm format:check | Write/check formatting                                                                                 |

validate neither installs nor prepares inputs nor runs browser tests. With no apps,
validate checks the shared framework and root tooling; there is no app to start or
browser suite to run. Single-host defaults use workspaceDefaultApp or the sole app.
Use --app for an explicit target, or --all for supported batch operations.
See [development](development.md) for default-port fallback and process cleanup.

## Add apps and dependencies

From the template source repository, use template:clone --target <this-project>
--name <app-name> with optional --template studio. Existing source is never
replaced. This creates a separate app commit with required config/dependencies.
The source repository's generator and verification matrix are not installed here.

When intentionally changing dependencies, reconcile with pnpm install
--no-frozen-lockfile, then verify pnpm install --frozen-lockfile. Ordinary CI and
bootstrap stay frozen. --offline requires a populated local store; it is not a
promise that a first installation needs no network.
