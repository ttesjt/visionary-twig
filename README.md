# Frontend framework and templates

This source repository maintains reusable framework packages, application templates,
optional site and provider adapters, and the tools that generate independent pnpm
workspaces. It contains no consuming applications. Generated projects own their
source, configuration, dependencies and development history.

## Prepare and verify the source

Use Node `>=24.15.0 <25` and pnpm `10.28.0`.

```sh
pnpm install --frozen-lockfile
pnpm bootstrap --include-templates --source default
pnpm validate
pnpm test:templates
```

The app templates run directly from their source directories for maintenance:

```sh
pnpm dev --app template-plain-next
pnpm dev --app template-studio
```

`validate` builds the libraries, checks prepared inputs, formatting, lint, types
and behavior tests, then builds the source templates. `test:templates` additionally
checks their browser behavior and independently generated projects.

## Generate an independent project

```sh
pnpm template:clone --output ../my-project --name @example/frontend
pnpm template:clone --output ../my-web --templates plain-next --browser
pnpm template:clone --output ../my-editor --templates studio --app studio=editor
```

The current generator expands the selected templates into the target project's
`apps/` and copies their shared dependency closure, tools, applicable standards,
documentation and lockfile. It installs, prepares default inputs and validates the
result. Template sources, source-repository maintenance tools, Git history, local
inputs and generated caches are excluded. Existing output directories are refused.

Adding templates to an existing external monorepo and selecting optional site or
adapter packages are future generator capabilities. This repository does not
provide an in-place app creation command. Storybook is not installed.

## Ownership

| Location                          | Purpose                                                                   |
| --------------------------------- | ------------------------------------------------------------------------- |
| `packages/shared`                 | Neutral contracts, runtime mechanisms, components and styles              |
| `packages/templates/plain-next`   | Next.js starter with prepared Text, AppConfig and Content                 |
| `packages/templates/studio`       | Editor starter built on the same resource foundation                      |
| `packages/templates/node-library` | Inactive, copyable Node library scaffold                                  |
| `packages/site`                   | Optional domain contracts, presentation and styles                        |
| `packages/adapters`               | Optional concrete service and runtime implementations                     |
| `scripts` and `tooling`           | Shared workspace operations and source-repository generation/verification |

Shared and template packages do not depend on concrete adapters or site packages.
Site packages consume neutral contracts; adapters implement them. Generated apps
are responsible for choosing and connecting concrete implementations.

## Maintained contracts

- [Template contract and generation](packages/templates/README.md)
- [Workspace commands](docs/commands.md) and [development ports](docs/development.md)
- [Architecture](docs/architecture.md) and [package conventions](docs/package-conventions.md)
- [Code standards](docs/code-standards.md), [monorepo standards](docs/monorepo-standards.md) and [repository conventions](docs/repository-conventions.md)
- [Resource initialization](docs/resource-initialization.md), [resource model](docs/resource-model.md) and [Provider contracts](docs/providers.md)
- [Text](docs/text-catalog.md), [AppConfig](docs/app-config.md) and [private local inputs](docs/content-profiles.md)
