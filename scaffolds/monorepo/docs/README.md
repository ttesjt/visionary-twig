# Project documentation

This is the guide to **your generated project**. Start with the root README and the
README in `apps/<name>`. You own the code and may change its structure; these guides
cover the capabilities supplied by the template.

## Choose a task

| Task                                     | Read                                                                                                                                                                                                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install, prepare, run, build or test     | [Commands](commands.md) and [development ports](development.md)                                                                                                                                                                   |
| Change a page or remove starter examples | Your app README; pages live in `apps/<name>`/src/app                                                                                                                                                                              |
| Change Text, AppConfig or Content        | [Resource initialization](resource-initialization.md), [Text](text-catalog.md), [AppConfig](app-config.md), [Content](content-runtime.md) and [private inputs](content-profiles.md)                                               |
| Add a namespace or change its scope      | [Resource model](resource-model.md), [Provider ownership](providers.md) and your app's src/site declarations                                                                                                                      |
| Add an app from the source templates     | [Adding apps](commands.md#add-apps-and-dependencies); the command runs in the separate template repository                                                                                                                        |
| Add or change a package                  | [Package conventions](package-conventions.md), [code standards](code-standards.md), [frontend standards](frontend-code-standards.md), [monorepo standards](monorepo-standards.md) and [feature boundaries](feature-boundaries.md) |
| Integrate an API, storage or service     | [Architecture](architecture.md), [data sources](data-sources.md), [data fetching](data-fetching.md) and the selected package README                                                                                               |
| Update metadata                          | [Metadata](metadata.md) and the app's src/site/metadata.ts                                                                                                                                                                        |
| Write or move documentation              | [Documentation standards](documentation-standards.md), this index and the owning app/package guide                                                                                                                                |

## Ownership and verification

Template-maintained mechanisms start in each app's src/infra; editable declarations
and extension points start in src/site. Those names describe the supplied starter,
not a rule for all future user features. Shared packages own neutral contracts;
apps choose services and content. Read [architecture](architecture.md) and
[repository conventions](repository-conventions.md) for the full map and checks.

Run pnpm validate for code/config changes and the app's browser tests for changes
to rendered behavior. Validate does not install, prepare inputs or run browsers.
Use [commands](commands.md) for the explicit workflow. Preserve .local overrides;
keep plans, logs and temporary review evidence outside production source.

See the [workspace licensing guide](../README.md#license) for the starter license
and your project's licensing choices.
