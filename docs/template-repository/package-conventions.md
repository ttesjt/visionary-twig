# Package conventions

## Package kinds

Declare workspaceKind in each package.json. The source checker validates it before recursive commands run.

| Kind            | Location                                                        | Required scripts                                                                                    |
| --------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `node-library`  | `packages/shared/*`, `packages/site/*` or `packages/adapters/*` | build, clean, dev, typecheck, lint, lint:fix, test, test:watch, test:coverage, format, format:check |
| `react-library` | `packages/shared/*`, `packages/site/*` or `packages/adapters/*` | Same as node-library; also declare a React peer                                                     |
| `next-app`      | `apps/*` or app templates                                       | Same code scripts plus start                                                                        |
| `styles`        | `packages/shared/*`, `packages/site/*` or `packages/adapters/*` | format, format:check; declare CSS sideEffects                                                       |

All workspaces are private ESM packages under the root package's scope. This repository uses @frontend; the checker derives this from the root name rather than hardcoding a personal scope. Add new kinds to scripts/lib/workspace-policy.mjs with rejection tests when another concrete application or library type is introduced.

## Source and tests

The starting-point matrix, creation routes and baseline-review coverage live in [repository conventions](repository-conventions.md). Libraries have src/index.ts, explicit exports, tsconfig.json, tsconfig.build.json, vitest.config.ts, and a README. Apps retain their framework compiler/type-generation lifecycle. CSS packages export source styles and preserve CSS side effects; they do not manufacture JavaScript build/typecheck/test commands.

Unit and component tests use the .test or .spec suffix before .ts, .tsx, .mts or .cts. Tests can live beside source or in test/ with integration fixtures. Build configs exclude test and spec files. Source templates own test/e2e and thin Playwright configs with shared Node+DOM typechecking; generated applications retain these host-owned tests. scripts/test contains Node-based tooling regression tests.

Dependency roles and cross-package APIs follow the [monorepo standards](../common/monorepo-standards.md). This repository's selected workspace/catalog protocols and layer restrictions live in [repository conventions](repository-conventions.md). React libraries declare React peers and install development test versions.

## Build lifecycle

Libraries emit ESM, declarations, and maps with TypeScript. Node-library relative imports use explicit runtime .js extensions. Shared strictness lives in tsconfig.base.json, Node globals in tsconfig.node.json, and JSX/DOM in tsconfig.react.json.

Root commands build library outputs before checking consumers, including integration tests of public exports. Development first builds libraries, then watches outputs alongside the application. Run pnpm test from the root; build a package before running an isolated test that consumes its built public exports.

pnpm check:workspace --source validates source/manifests without requiring dist. pnpm check:workspace additionally verifies public export targets exist after building. pnpm validate runs source policy, package builds, export checks, formatting, lint, types, tests, and application builds. pnpm test:e2e builds the production application and verifies browser behavior.

## Runnable application metadata

Every next-app declares `workspaceApp` in package.json: numeric devPort/testPort,
hostname, and app-relative testConfig. Ports use the common 1–65535 validation;
the configuration must be an existing file within the repository, including its
real symlink target. The source checker and runners use the same parser. No
app-name exception is required for new workspaces.

Root dev/test runners accept `--app <directory-id>`; single-host defaults come
from workspaceDefaultApp or the sole app. Multiple apps without a declared default
require an explicit target. Development uses the shared [port policy](development.md):
bounded fallback for manifest defaults, strict explicit overrides unless
`--port-fallback` is supplied. Tests and production never silently change ports.
Dev builds and watches the selected host's dependency closure. E2E builds that
closure and the selected app; thin Playwright configs reuse shared browser/address/
server defaults. Tools keep specs/configs in their own Node+DOM typecheck and out
of Vitest discovery. `--all` enumerates existing apps and `--include-templates`
also selects source templates. `--production-defaults` requires a declared host
test hook. `start --app <id>` runs that previously built application.

## Starting points

The Next app templates are active workspaces with unique template-* names
and ports. node-library remains an inactive scaffold. Template configs resolve
at their real source location; clone initialization adapts destination configs.
Templates can consume shared and site packages. Runtime consumers cannot depend
on a template. Root pnpm validate checks source templates. pnpm test:templates also
runs in-place browser checks and the public generator's fresh-project verification.

Concrete providers use the adapters layer while retaining their node-library format. Declare provider SDK names in workspaceAdapter.providerPackages so source/manifest checks and template generation recognize their ownership. SDKs, resource identities and lifecycle stay inside adapters; apps create providers. Core shared/site/template packages reject direct and transitive adapter dependencies across all dependency groups.

Root typed lint runs root/tooling checks, then each workspace’s existing lint command in separate processes. This releases TypeScript project-service memory between workspaces while preserving the same shared ESLint rules. It also works with generated projects containing only selected packages/apps.

Packages may declare workspaceEntrypoints mapping public exports to pure/client/node. Source checks follow transitive workspace imports: pure entries reject React/Node, client entries reject Node, and client entries must retain a leading directive. Type-only imports do not create runtime edges. TextCatalog, AppConfig and prepared-data declare these contracts explicitly.

## Code organization and enforcement

The [portable code standards](../common/code-standards.md) own general TS and frontend
requirements, including recursive feature ownership and module APIs. The
[monorepo standards](../common/monorepo-standards.md) own package collaboration and pnpm integration.
The [repository conventions](repository-conventions.md) own workspaceFeatures declarations,
check coverage, repository paths/configuration and validation requirements. This
document owns package/build formats.

See [feature boundaries](../common/feature-boundaries.md) for declarations and cross-package shared capabilities. The resource guide describes the [template examples](../common/resource-initialization.md#feature-boundaries-in-the-resource-implementation).
