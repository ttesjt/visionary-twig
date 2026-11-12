# Repository conventions

This document owns this workspace's concrete choices and enforcement. The
[TypeScript](code-standards.md) and [frontend](frontend-code-standards.md) standards own portable requirements; the
[monorepo standards](monorepo-standards.md) own package collaboration and pnpm
integration. General rules stay in those documents rather than being restated here.
Architecture, package and command contracts describe their repository-specific details.

Neither an absent checker nor a successful check waives a requirement outside the
tool's scope. AGENTS.md links to these maintained contracts. The separate references
workspace holds rationale and engineering records, never a prerequisite for
installing, checking or building a clone.

## Workspace ownership and runtime boundaries

This checkout chooses the following implementation of the monorepo standards:

| Choice                         | Repository contract                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Toolchain/install              | Node and exact pnpm policies in package.json; one root pnpm-lock.yaml; ordinary bootstrap is frozen           |
| Internal dependencies          | workspace:* in the owning consumer manifest                                                                   |
| Aligned external versions      | catalog: with root pnpm-workspace.yaml ranges                                                                 |
| Package format and consumption | Private ESM workspaces; libraries emit dist before hosts consume public entries                               |
| Build/watch                    | Root runners prepare the selected dependency closure and watch library outputs before/during host development |
| Environment entries            | workspaceEntrypoints declares pure/client/node contracts separately from feature APIs                         |

Root tooling orchestrates hosts and libraries. apps owns runnable composition and
actual content; packages/shared owns neutral reusable capabilities; packages/site
owns website-domain behavior; packages/adapters implements concrete provider ports;
Optional site/adapters packages enter only when explicitly selected.
See [architecture](architecture.md) for the maintained layer design.

Generic packages cannot import Next.js, application internals/stores/transports or
stylesheets. Shared and site workspaces cannot depend on adapters or their
provider SDKs, directly or transitively, including through test/dev dependencies.
Adapters consume neutral shared ports and cannot import apps or site-domain code;
apps select/configure providers in src/integrations and inject them. See architecture
for integration ownership, and [package conventions](package-conventions.md) for
workspaceKind scripts, library formats, React peers and test placement.

## Package starting points and creation

This section implements M1's standard-package-starting-point requirement. A formal
scaffold is copyable starter source; a reference package demonstrates the engineering
contract but also contains real implementation that must not be copied wholesale.
There is no general in-workspace library/package creation command today.

shared/site/adapters describe dependency layers, not additional workspaceKind values.
A concrete adapter uses the appropriate library format; adapters owning provider SDKs
list those SDKs in workspaceAdapter.providerPackages. There is no separate adapter
scaffold. Follow the adapter restrictions above.

### Manual library and stylesheet creation

1. Choose the owning layer, supported workspaceKind and an unused target directory.
   Runtime packages belong under packages/shared, packages/site or packages/adapters,
   not directly under packages/. Use a unique package name in the root scope.
2. For Node libraries, copy only the scaffold's source/config/test/documentation files.
   Rename its manifest, README and self-imports in tests; replace greeting examples
   with meaningful package behavior. For React/styles packages, reuse the reference's
   engineering format and create the actual implementation independently. Do not copy
   node_modules, dist, caches, generated files or local inputs.
3. Keep the shared configuration links appropriate to the environment. The Node
   scaffold extends tsconfig.node.json and vitest.config.base.ts (Node); ui extends
   tsconfig.react.json and vitest.config.react.ts for JSX/jsdom component tests.
   Libraries separate source builds from source/test typechecking, exclude tests
   from dist and provide explicit public runtime/type entries. Retain only needed
   setup/fixtures and tests. Styles packages export CSS source and do not require
   invented JavaScript build/test commands. Exact required files/scripts and test
   placement remain in [package conventions](package-conventions.md).
4. Declare the package's actual dependencies, public API and relevant environment
   contracts. Reconcile the new manifest with the root lockfile using the explicit
   dependency-change workflow (pnpm install --no-frozen-lockfile), then run source
   policy and validation as described below. Review the package against its chosen
   starting point, including meaningful tests and clean-output consumption.

The Node scaffold supports colocated unit tests and a test/ public-built-entry test;
the public-entry test needs the library output first. React component tests use the
shared jsdom setup, while layout/focus behavior belongs in browser acceptance.
Business feature folders remain governed by the code standards, not by a fixed
services/controllers/utils checklist.

### Adding an application

Run from the source template repository:

```sh
pnpm template:clone --target <this-project> --name web
pnpm template:clone --target <this-project> --name editor --template studio
```

The command checks the target contract and clean Git status, preserves existing
source and ignored custom inputs, and commits one complete app task. The source
repository is only needed when obtaining another template, never for normal
installation, preparation, development or builds. Templates are not stored here.

### Existing checks and remaining review

| Area                             | Actual coverage                                                                                                                                                                                                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supported kind and minimum shape | Source policy checks workspaceKind, location, scoped/private/ESM identity and nonempty required scripts and existing required files. Package conventions maintains that required matrix.                                                                                                      |
| Libraries                        | Source policy requires public exports, rejects undeclared production imports and enforces Node runtime import extensions; React libraries must declare a React peer. Built checks verify export targets exist. These checks do not compare a package byte-for-byte with a scaffold.           |
| Styles                           | Source policy checks stylesheet ownership, React CSS exports and packaging, CSS side effects and required formatting tasks. It does not invent JS tests for CSS-only workspaces.                                                                                                              |
| Next apps                        | Source policy checks workspaceApp metadata and test configuration paths; enabled text/config contracts require their files, commands and preparation guards. validate runs the active hosts' real checks/builds.                                                                              |
| Baseline consistency             | Shared-config inheritance, appropriate test scenarios, deliberate deviations and synchronized starter updates require review. There is no template-origin check or complete configuration-equality check. Feature/environment automation remains limited to the declarations described below. |

When adding a genuinely new kind, update its format contract and creation guidance
with the supported-kind policy and valid/rejection tests. For an existing kind,
explain necessary engineering deviations in its README or maintained contract and
improve the common starting point when the same need recurs. This documentation
change does not retrofit or reshape existing package implementations.

## Styles and content ownership

React packages can ship component defaults under `src/styles/` with explicit CSS
exports and CSS side effects. Include that directory in the package's published
files. Apps keep their own CSS in `src/styles/` and explicitly select the entries
they need. The shared styles workspace provides optional visual tokens, themes
and appearance. Keep demo-only CSS in a separate entry.

Use stable ui-* classes/data attributes and bounded semantic variants. Do not add
Tailwind, CSS modules or authored inline styles.
Tracked content and fixtures stay fictional and neutral; actual personal content
belongs to ignored local profiles or external sources. Apps own actual content;
packages own contracts and behavior. UI strings use the validated TextCatalog;
code references keys. Prepare resource inputs explicitly before dev or build. Legacy
hosts import fixed generated files; plain-next loads prepared Text, AppConfig and
Content by scope. See [commands](commands.md) and [resource initialization](resource-initialization.md).

## Formatting and type configuration

The root TypeScript, ESLint and Prettier files are authoritative. Preserve strict,
noUncheckedIndexedAccess and exactOptionalPropertyTypes in the shared TS base.
Do not introduce competing settings in individual packages. Current formatting is
spaces (width 2), single quotes, semicolons and LF; see .prettierrc for the complete
configuration. Do not reformat unrelated files.

## Declaring automated feature boundaries

Declare scopes in the owning workspace's package.json with workspaceFeatures.
The checker never guesses that a components/, schemas/ or arbitrary directory is
a feature. This declaration configures enforcement of G2/G4; it does not define
symbol exports on behalf of TypeScript.

```json
{
  "workspaceFeatures": {
    "src/projects": {
      "public": ["index.ts"],
      "shared": ["schemas/index.ts"]
    },
    "src/projects/browsing": {
      "public": ["index.ts"]
    },
    "src/projects/editing": {
      "public": ["index.ts"]
    }
  }
}
```

The files in this declaration correspond to the feature tree in the portable
standard. Create entries only for real APIs; do not generate empty categories.

- Scope keys are canonical workspace-relative directories under src/ (or src itself).
  public is a nonempty list of existing files relative to that scope; shared is optional.
- Entries are exact paths, not globs. The same entry may be public and shared when
  outer composition and children should both consume it. A shared entry must belong
  to its declaring scope, not a child feature relabeled as a common capability.
- Unsafe paths, missing files, escaping symlinks, duplicates and unknown declaration
  fields fail. Physical feature roots must remain inside the workspace's src/ tree.
- The most specific declared containing scope owns a file. An undeclared directory
  does not introduce a new feature boundary; an enclosing declared scope still applies.
- Outer consumers use public entries through every crossed scope. Parent composition
  may re-export a child's public API through its own entry. Alternatively, to allow
  direct access to a nested public file, explicitly list that exact file as public
  in every crossed parent scope as well. This does not make it an ancestor shared entry.
- Children use explicit ancestor shared entries. Unrelated feature branches do not
  depend on one another. Shared helpers must not reach back into descendant features,
  including through type references or intermediate wrappers.
- A feature may consume a neutral capability from another workspace through a
  shared public entry. Each enclosing scope must expose that entry. The shared
  dependency graph, package exports and workspace layers still undergo their
  respective checks. See [feature boundaries](feature-boundaries.md).

This is opt-in automation, not an opt-in architectural requirement. Existing code
has not been automatically registered or reorganized. When adding or organizing a
scope, declare real boundaries and cover permitted consumers and rejected paths.
Do not perform a bulk migration or rearrange files just to satisfy size reminders.

## Check coverage and limits

pnpm check:workspace --source checks source and manifests without requiring built
outputs. It covers source and tests, handwritten declarations, type imports/type
queries, re-exports and literal dynamic imports. Feature checks resolve tsconfig
paths, canonical symlinks and normal workspace public source exports and follow
shared helpers to reject indirect back-edges. Internal tests may access their own
scope; external tests consume the public API.

The built check requires the exact local runtime files for referenced package
imports aliases. Source-only checks allow those files to be absent before build.

This is source analysis, not a full module loader. Missing modules remain the
responsibility of TypeScript/package checks. Computed imports, custom conditional
export selection, framework-specific loaders, arbitrary file/network I/O and runtime
resource ownership need review. Build/generated/local/dependency output is excluded.
Undeclared feature boundaries and entry environments are not automatically proved
safe. General dependency cycles, export symbol selection and initialization side
effects still need review.

| Rule                                                                                                  | Enforcement                                                                          |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Public package exports, owning dependencies and workspace layer direction                             | Hard workspace policy, including tests/devDependencies and transitive adapter chains |
| Explicit workspaceFeatures paths, public/shared entries and recursive dependency direction            | Hard source checks for declared scopes and resolvable references                     |
| Explicit workspaceEntrypoints pure/client/node contracts and client directives                        | Hard transitive entry-boundary checks; type-only imports do not create runtime edges |
| Configured strict TS, ESLint (including explicit any) and Prettier rules                              | Hard type/lint/format checks; these do not prove runtime input validation            |
| Semantic reuse, constant ownership, validation, async correctness, error diagnostics and test quality | Review plus relevant behavior tests                                                  |
| API design, unregistered scopes, general cycles and side effects                                      | Review; an index.ts alone provides no encapsulation                                  |
| Code standards G3 directory/file-size reminders                                                       | Review reminders, never CI size failures                                             |

Apply the code standards' G3 review reminders without redefining their thresholds
here. Respect Next routing semantics. Required policies still apply when enforcement
needs review.

Keep common checkers in root tooling with valid-use and rejection tests. Do not
copy checkers or invent per-package thresholds. New rules must document coverage
and limitations; branches without the implementation must not claim to enforce it.

## Validation and delivery

Use pnpm check:workspace --source, pnpm lint, pnpm typecheck and pnpm format:check
for their respective checks. pnpm validate aggregates source policy, library builds,
built export verification, formatting, lint, types, tests and application builds.
Code/config changes require validate. Rendering/layout/theme changes also require
relevant browser checks; policy regressions belong in scripts/test. Package/build
changes need clean-output verification. See [commands](commands.md) for the exact
lifecycle and [development](development.md) for worktree-local execution.

Engineering plans, discussions, progress, review reports and verification screenshots
belong in references, outside the product source. Durable architecture, API and usage
docs stay in this repository. Update AGENTS and generated workspace references when
a maintained contract moves; generated clones carry code standards, monorepo standards,
repository conventions and checking tools and must not require access to references.
