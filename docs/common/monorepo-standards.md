# Monorepo engineering standards

These standards are portable across multi-package repositories. Section 1 covers
package collaboration independently of a task runner or package manager. Section 2
adds pnpm integration. Concrete directory layouts, dependency layers, versions,
commands and checker configuration belong in a repository policy.

The [code standards](code-standards.md) own module-level code quality, recursive
features, environment boundaries and the distinction between requirements, defaults
and review reminders. This document owns package collaboration; it does not require
one package per feature or a particular frontend framework, provider or task runner.

## 1. General monorepo requirements

### M1. Package purpose and ownership

A package must have a clear capability, owner and public contract. Create package
boundaries for meaningful independent consumers, dependency isolation or lifecycle
needs. A folder or feature does not need its own package merely because it has grown.
Use the scope/ownership rules in the code standards for organization within packages.

Distinguish runnable hosts, reusable capabilities and repository tooling. Hosts own
application composition and environment choices; reusable packages must not depend
on a host's private implementation. Document the actual layers the project adopts
rather than treating one directory layout as universal. A reusable provider adapter
is still a concrete integration; its reusability alone does not make it a mandatory
core dependency.

#### Standard package starting points

For package kinds created repeatedly, a repository must maintain a standard shape
and a usable creation path. Include shared configuration, public entries, build/output
contracts, the test model, task integration and basic documentation. The repository
policy must identify the supported kinds, their template or reference, creation
commands or manual steps, and what automation actually checks.

New packages use the applicable starting point by default. Document justified
extensions or departures from the common engineering contract. When a new reusable
package kind emerges, define its contract and creation path; repeated variations
should improve the shared starting point instead of becoming independent copies.

Templates should reference shared configuration rather than duplicate it. Maintain
them with configuration changes and validate representative consumers so the starting
point does not become an outdated example. A template is not the whole enforcement
mechanism: check the resulting package contracts and distinguish automated coverage
from review. It must not dictate business implementation, force responsibility folders
inside every feature or add scripts/dependencies a package kind does not need.

### M2. Dependencies belong to their consumers

Every package must declare the dependencies consumed by its code in its own
manifest. Do not rely on root installation, hoisting, a sibling's transitive
dependency or an editor path alias to make an undeclared import work. A documented
root-owned CLI toolchain may provide shared build/lint/test tools; that tooling
contract does not grant child code access to undeclared runtime/source dependencies.

| Dependency role                      | Contract                                                    |
| ------------------------------------ | ----------------------------------------------------------- |
| Runtime implementation               | Declare as a runtime dependency of the consumer             |
| Consumer-supplied compatible runtime | Declare a peer contract; a dev copy may support local tests |
| Test/build/lint tooling only         | Declare as a development dependency of its owner            |
| Optional runtime capability          | Declare as optional and handle absence explicitly           |

Type-only usage is not automatically a development dependency: check whether emitted
public declarations still require consumers to resolve the referenced package.
Peer ranges must express supported compatibility, not merely the installed test
version. A dev/test dependency must not bypass an architectural boundary. Align
versions that require coordination and document intentional differences rather than
forcing unrelated packages onto one version without a compatibility reason.

### M3. Public package APIs and dependency graphs

Cross-package consumers must use package names and public exports, never another
package's src/dist paths or repository-relative implementation imports. This applies
to types, re-exports, literal dynamic imports and cross-package tests. Path aliases
and test configuration must not create a private back door. Explicit fixture/file
inputs remain data contracts and must not become hidden source-code dependencies.

A package's export map and declarations must describe its actual supported API.
Apply the code standards' environment rules to those entries. A browser entry must
not accidentally pull in a Node-only dependency. Keep the package dependency graph
acyclic and consistent with the project's declared layers. Moving a forbidden edge
into a helper, type import or dev dependency does not make it valid.

When a contract changes, inspect affected consumers, not only the edited package.
Fix ownership and API design rather than copying definitions or hiding a cycle
behind dynamic loading. The project must state which graph/API rules tools enforce
and which still require review.

### M4. Consumption, build and development lifecycle

A project must declare how each package entry is consumed: source, built output or
an explicit environment-specific export. These are valid choices when complete;
do not switch implicitly according to whether a developer already has build output.

- For built-output entries, build dependencies before consumers and verify exported
  runtime files, declarations and required assets exist in a clean checkout.
- For source entries, configure the consuming compiler, bundler, types and tests to
  process the public source contract. Do not use cross-package private paths to
  repair a missing build configuration.
- Root orchestration selects tasks and orders dependencies; packages own their
  implementation and capability-specific scripts. A stylesheet-only package need
  not invent a JavaScript build or a fake test just to match a script list.
- Development must prepare required outputs before starting a consumer and keep
  relevant dependencies updated. Watch/restart behavior, readiness, failures and
  cleanup must be explicit. A running process alone does not prove the host is ready.
- Run independent work concurrently only when prerequisites and output ownership
  allow it. Do not have several tasks race to install, generate or overwrite the
  same files. Reuse completed prerequisite builds within an aggregate workflow.

A cache is an optimization. A clean install/build must work without the developer's
old dist, generated files or cache. If a task cache is used, its keys and outputs
must account for the inputs that affect the result; do not treat an incomplete
cached result as successful preparation.

### M5. Shared tooling and task interfaces

Share compiler, lint, formatter and test foundations, with explicit differences
for runtime environments. Do not copy diverging configurations into every package.
Keep domain implementation in its owner rather than growing root scripts into a
second business layer.

Task interfaces must identify scope, prerequisites and side effects. Distinguish
read-only checks, preparation, build, start and operations that contact or modify
external services. Do not introduce implicit publishing or data migration into an
ordinary install/build. Unknown explicit targets must fail rather than silently
validating no packages. A selected task may also need dependencies or affected
consumers; document which closure it actually covers.

A repository may use package-manager scripts or a dedicated task runner. The
requirement is a coherent lifecycle; no extra orchestration service is mandatory.

### M6. Reproducible inputs and artifacts

Declare compatible runtime and package-manager versions and one coherent installation
and lockfile policy. Keep manifests and lockfiles consistent. Ordinary verification
must not silently repair their disagreement; dependency updates are explicit work.

Distinguish tracked source/defaults, reproducible generated output, disposable caches
and private local inputs. Ignoring a file does not deliver it to a build or production
runtime. Preparation and packaging must account for every required file and preserve
user-owned inputs. Paths must be anchored to a documented root or explicit input,
not accidentally to the caller's shell directory or a developer's absolute path.

### M7. Templates and package distribution

If a project includes generators/templates, produce the selected dependency closure,
reconcile renamed manifests/root configuration/lockfiles and validate the generated
project independently. Generated projects must not require the source repository's
apps, private data, references, node_modules or pre-existing dist. Give templates
local initialization hooks only where needed; share common file/path work and
coordinate root updates and installation centrally.

If packages are distributed, verify their packed exports, type declarations, assets
and dependency metadata in a consumer context. A successful in-repository build does
not alone prove the published artifact is usable. No release tool or versioning
scheme is prescribed here.

### M8. Validation and review

Validate package behavior, public cross-package contracts and actual host integration
at the appropriate boundary. Include clean-output verification when changing build
or packaging contracts. Changes to dependency discovery, public paths and graph rules
need both valid-use and rejection tests. Generated projects need independent checks
when their generation/distribution contract changes.

Follow the code standards' requirement-versus-automation distinction: a green lint
or local unit run does not establish undeclared dependencies, publication readiness
or compatibility across all consumers. Document exclusions and static-analysis limits.
Exact commands, CI coverage and project layer names remain repository-owned.

## 2. pnpm integration

Apply this section when the repository chooses pnpm. Verify configuration and CLI
support against its pinned pnpm version. The references below use pnpm 10 docs;
this standard does not require upgrading a project to any particular version.

### P1. Workspace and installation policy

Declare membership in pnpm-workspace.yaml and keep patterns aligned with the intended
packages. Record the supported Node policy and exact pnpm toolchain in root metadata
and make local/CI setup use it. Do not mix package managers or create incidental
nested lockfiles. A single workspace should normally use one shared root lockfile;
an intentional alternative needs an explicit install/CI policy.

Ordinary CI uses pnpm install --frozen-lockfile. Manifest changes and fresh-project
generation may require a deliberate lockfile reconciliation step; afterwards verify
frozen installation again. Do not disable freezing just to conceal a stale lockfile.
Install at the chosen workspace boundary and coordinate it once per workflow rather
than running independent package/template installs concurrently. Offline installation
requires the needed dependencies to already exist in the store; it does not prove
a network-free first install is universally possible. See [pnpm install](https://pnpm.io/10.x/cli/install).

### P2. Workspace references and aligned external versions

Use workspace: when a dependency must resolve to a local workspace package. Choose
workspace:*, workspace:^ or another supported range according to the project's
version/release policy. Do not rely on incidental local linking of an ordinary
registry range. See [pnpm workspaces](https://pnpm.io/10.x/workspaces).

Catalogs are an optional way to centralize coordinated external dependency ranges.
When adopted, consumers still declare their own dependencies using catalog: or a
named catalog; the catalog does not grant package access by itself. Independent
compatibility needs may justify separate ranges/catalogs. See [pnpm catalogs](https://pnpm.io/10.x/catalogs).

### P3. Task selection and scope

Use declared package identities or documented directory selectors. Quote selectors
for the shell. Distinguish a package, its dependencies and its dependents:

| Example selector                             | Selected scope                              |
| -------------------------------------------- | ------------------------------------------- |
| pnpm --filter '@example/app' run build       | One package                                 |
| pnpm --filter '@example/app...' run build    | That package and its workspace dependencies |
| pnpm --filter '...@example/library' run test | That package and its workspace dependents   |

Selection alone does not install dependencies, prepare inputs or define the project's
full task graph. Ensure prerequisite tasks and required scripts actually run, and
reject an empty match for an explicitly required target, using --fail-if-no-match
where appropriate. Do not replace the documented root workflow with a narrower
filter and report the result as full validation. See [pnpm filtering](https://pnpm.io/10.x/filtering).
