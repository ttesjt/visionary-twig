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
pnpm repo:clone --output ../my-project --name @example/frontend
pnpm repo:clone --output ../bare --bare
pnpm template:clone --target ../my-project --name editor --template studio
```

The generator creates an external pnpm monorepo with all neutral shared packages.
Default mode adds plain-next in apps/web; --bare creates only the framework and
empty app/site/adapter layers. Add more apps with template:clone. Selected optional
packages follow their real dependency closure. Existing source is never overwritten;
each app task is a separate commit after the framework baseline. Targets carry their
own manifests, standards, guides, tools, CI and lockfile. Templates, source history,
private inputs and source-maintenance tools stay here. See the
[generation contract](docs/template-repository/generation.md).

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

Start with the [task-based documentation index](docs/README.md). Contributors follow
[the source workflow](docs/template-repository/contributing.md),
[verification guidance](docs/template-repository/verification.md) and
[documentation standards](docs/common/documentation-standards.md).

- [Template contract and generation](packages/templates/README.md)
- [Workspace commands](docs/template-repository/commands.md) and [development ports](docs/template-repository/development.md)
- [Architecture](docs/template-repository/architecture.md) and [package conventions](docs/template-repository/package-conventions.md)
- [Code standards](docs/common/code-standards.md), [monorepo standards](docs/common/monorepo-standards.md) and [repository conventions](docs/template-repository/repository-conventions.md)
- [Resource initialization](docs/common/resource-initialization.md), [resource model](docs/common/resource-model.md) and [Provider contracts](docs/template-repository/providers.md)
- [Text](docs/common/text-catalog.md), [AppConfig](docs/common/app-config.md) and [private local inputs](docs/common/content-profiles.md)

## License

Framework and template sources are available under the [MIT License](LICENSE).
Dependencies retain their respective licenses. Generated workspaces include this
license for the framework and template code they receive.
