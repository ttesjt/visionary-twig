# Workspace commands

The source repository maintains framework packages and source templates. It has no
consuming apps or default host. Generated projects retain the same generic runners
for their own apps; template maintenance and generation stay in the source repo.

## Source maintenance and independent generation

```sh
pnpm install --frozen-lockfile
pnpm bootstrap --include-templates --source default
pnpm dev --app template-plain-next
pnpm dev --app template-studio
pnpm repo:clone --output ../my-project --name @example/frontend
pnpm repo:clone --preset node --output ../my-tools --name @example/tools
```

`repo:clone` creates an independent framework baseline and, by default, one plain-next
app named web. The frontend `--bare` option creates the framework without apps. `template:clone --target <repo> --name <app>` adds
one named app to an existing generated monorepo; --template defaults to plain-next.
Both operations validate installation and preserve existing source. Every app task
has its own commit. See [the generation contract](generation.md) for flags, conflicts,
optional package delivery, history and failure behavior.

`repo:clone --preset node` generates a package-only workspace with its own
[development commands](../../scaffolds/node/docs/development.md). Run
`pnpm test:node-clone` in the source repository to verify independent
installation, build, tests and public exports.

## Generic host selection

Root commands use app **directory IDs**, independent of package scopes.
`pnpm apps:list --include-templates` lists targets. Source template IDs are
`template-<template-id>`. Unknown targets and conflicting arguments fail before
building or starting processes. There are no per-host command aliases.

| Command                                            | Scope and behavior                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------- |
| `dev --app <id>`                                   | Builds/watches the selected dependency closure and starts one development server |
| `start --app <id>`                                 | Starts one already-built production host                                         |
| `build --all --include-templates`                  | Builds selected dependencies and hosts                                           |
| `bootstrap --include-templates`                    | Frozen install, selected dependency builds and declared-input preparation        |
| `app:prepare --include-templates --source default` | Builds required dependencies and prepares the selected declared inputs           |
| `app:check --include-templates`                    | Checks existing prepared inputs without installation, builds or writes           |
| `test:e2e --app <id>`                              | Builds selected dependencies/host and runs its production browser tests          |

Batch commands accept `--all` and `--include-templates`; do not combine these with
`--app`. Single-host dev/start commands require one target. A generated project's
default comes from its manifest or sole app. With no consuming apps, select a
source template explicitly. Library-only builds still work without hosts.

## Prepared inputs

Preparation and bootstrap default to `--source auto`: existing optional per-file
custom inputs override tracked defaults. `--source default` ignores overrides;
`--source custom` requires every declared custom file. Invalid, unreadable or unsafe
inputs fail without falling back. Missing optional overrides participate in
freshness checks. Namespace Text, AppConfig and Content retain their host-owned
schemas and paths.

```sh
pnpm app:prepare --app template-plain-next --source default
pnpm app:check --app template-plain-next
```

Preparation validates selected inputs before replacement; file replacement and
rollback are atomic per host, not across several hosts. It writes `.generated`,
never `.local`, databases, media or cloud resources. Runtime consumes the prepared
artifacts. Dev/build check freshness instead of silently preparing.

## Host extensions

A host may declare `workspaceApp.devHook` and `workspaceApp.testHook` as bounded
project files exporting `environment(context)`. Generic runners pass the selected
host and a copied environment; the host owns any custom runtime selection.
`--data <mode>` and `--data-environment <name>` require a declared development hook.
`--production-defaults` requires a test hook. These facilities do not select a
provider, seed/migrate a database or deploy anything on their own.

Browser runners disable tracking endpoints unless a fictional test endpoint is
explicitly supplied. `--grep <pattern>` reaches Playwright as one argument.
Template verification selects default prepared inputs and protects existing local
sources before temporarily exercising overrides.

## Checks and side effects

| Command                                                               | Behavior                                                                                                                               |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `build:packages`                                                      | Source-policy checks and all library builds                                                                                            |
| `validate`                                                            | Library build once, prepared-input/export/format/lint/type checks, tooling/unit tests and source-template builds; no browser tests     |
| `test:templates`                                                      | Source-template and independent-clone browser/default/custom/production acceptance; `--source-only` or `--clone-only` limits the phase |
| `test:e2e:theme-policy`                                               | Fixed light/dark matrix for the actual consuming hosts in a generated project                                                          |
| `test`, `test:tooling`, `test:watch`, `test:coverage`                 | Behavior tests; ordinary/coverage modes build libraries, tooling/watch expect existing outputs                                         |
| `text:prepare/check`, `config:prepare/check`, `content:prepare/check` | Independent resource-kind operations with the same source/target policy                                                                |
| `check:workspace`                                                     | Ownership/dependency/export checks; `--source` skips output checks                                                                     |
| `typecheck`                                                           | Builds libraries, then checks tooling and workspace types                                                                              |
| `format`, `lint`                                                      | Formatting and source checks; `format` and `lint --fix` edit source                                                                    |
| `clean`                                                               | Removes build/test outputs, preserving local source content                                                                            |

Internal validation phases remain composed in `scripts/workspace/tasks.mjs`.
Validation never installs, prepares inputs, runs browsers or accesses cloud data.
Standalone type/test checks remain self-sufficient. Each generated project owns
its own lockfile and lifecycle; source template maintenance is not copied into it.
