# Framework documentation

This is the entry for **source-repository users and maintainers**, including coding
agents. Root [README](../README.md) gives the shortest start; [AGENTS](../AGENTS.md)
and nested rules define contributor obligations. Choose a task below, then read the
owning package's public contract.

## Choose a task

| Task                             | Start here                                                                                                                                                   | Owning contract                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create a workspace or add an app | [Generation usage](template-repository/using-template.md)                                                                                                    | [Generation protocol](template-repository/generation.md) and [template recipes](../packages/templates/README.md)                                                        |
| Take over a generated project    | Its root README, package or app README and docs/README.md                                                                                                    | [Frontend scaffold](../scaffolds/monorepo/README.md.template) or [Node scaffold](../scaffolds/node/README.md.template)                                                  |
| Understand boundaries and design | [Architecture](template-repository/architecture.md)                                                                                                          | [Monorepo standards](common/monorepo-standards.md) and [package conventions](template-repository/package-conventions.md)                                                |
| Add or change a package          | [Contributing](template-repository/contributing.md)                                                                                                          | [Code standards](common/code-standards.md), [package conventions](template-repository/package-conventions.md) and [feature boundaries](common/feature-boundaries.md)    |
| Build components or styles       | [Frontend standards](common/frontend-code-standards.md) and [styling](template-repository/architecture.md#layout-and-styling)                                | [UI](../packages/shared/ui/README.md), [visual styles](../packages/shared/styles/README.md)                                                                             |
| Prepare text, config or content  | [Resource lifecycle](common/resource-initialization.md) and [resource model](common/resource-model.md)                                                       | [Text](common/text-catalog.md), [AppConfig](common/app-config.md), [Content](common/content-runtime.md) and [private inputs](common/content-profiles.md)                |
| Change Provider ownership        | [Provider guide](template-repository/providers.md)                                                                                                           | Resource package contracts and the host's src/infra and src/site declarations                                                                                           |
| Fetch browser data               | [Data fetching](common/data-fetching.md)                                                                                                                     | Host-owned endpoint, validation, cache and failure policy                                                                                                               |
| Integrate a service or storage   | [Data-source boundaries](template-repository/data-sources.md)                                                                                                | [Storage ports](../packages/shared/storage/README.md) and the selected adapter README                                                                                   |
| Extend editing and publishing    | [Content runtime](common/content-runtime.md)                                                                                                                 | [Content protocol](../packages/shared/ui-document/README.md), [Studio](../packages/site/studio/README.md) and [Puck adapter](../packages/shared/puck-adapter/README.md) |
| Work on a starter or generator   | [Template contract](../packages/templates/README.md) and [contributing](template-repository/contributing.md)                                                 | [Generation protocol](template-repository/generation.md) and [verification](template-repository/verification.md)                                                        |
| Run or verify changes            | [Commands](template-repository/commands.md), [development ports](template-repository/development.md) and [verification](template-repository/verification.md) | Root manifests, owning tests and actual generated artifacts                                                                                                             |
| Write or move documentation      | [Documentation standards](common/documentation-standards.md)                                                                                                 | This index, the owning package guide and [documentation delivery](template-repository/generation.md#documentation-delivery-and-acceptance)                              |

## Documentation ownership

- [Common standards and resource contracts](common/) are maintained once and
  delivered where applicable. They do not depend on external engineering records.
- [Source guides](template-repository/) cover template maintenance, generation and
  source verification; they are not copied wholesale into user projects.
- [Frontend scaffold guides](../scaffolds/monorepo/docs/), [Node scaffold guides](../scaffolds/node/docs/) and each template's
  template/README.md are authored for the generated project's actual paths and tools.
- Package READMEs and selected package documentation travel with their packages.
  Each remains the exact reference for that capability's API and limits.
- Temporary plans, progress and review evidence stay in the external references
  workspace. They are neither a second API manual nor an installation dependency.

For the source repository and generated workspace licenses, see
[licensing in the root README](../README.md#license).
