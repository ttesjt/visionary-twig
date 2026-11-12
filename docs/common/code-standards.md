# Code standards

These standards apply to TypeScript source, public contracts, tooling and tests.
Projects document their environment-specific rules separately.

“Must” and “do not” are requirements. “Default” and “prefer” establish the normal
choice; exceptions need a concrete reason. A review reminder prompts a judgment,
not a mechanical failure. A requirement is not automatically a lint rule: projects
must document which checks exist, their coverage and their limits. Local paths,
commands, workspace layers and checker configuration belong in a separate
repository policy, not in this portable standard.

## General TypeScript

### G1. Maintainability and semantic reuse

A reader should quickly find a definition, understand the main behavior and know
where to change it. Give each concept, rule and algorithm one authoritative source.
Before adding code, look for existing functions, schemas, types, constants and
configuration; reuse or improve the owner rather than adding a parallel version.

- A second occurrence of the same rule prompts an extraction review. Include
  validation, filtering, transformations, URL construction, state decisions, types,
  defaults and field mappings. Similar syntax alone does not establish shared meaning.
- Extract when consumers share meaning and a reason to change. Keep independent
  rules independent; pass genuinely different strategies as explicit parameters.
- Give abstractions clear inputs, outputs and responsibilities. Do not combine
  unrelated requirements with many booleans, special cases or excessive generics.
- Do not handwrite duplicate versions of one shared data contract. Derive types
  from runtime schemas and unions/editor options from controlled option definitions.
- Keep definitions in the smallest module that owns their meaning. Grow reuse from
  a local helper to a feature module, a package API and finally a dedicated package
  as real consumers require. Do not put everything in global shared/utils/types.
  Contracts with already-known independent consumers may be extracted up front.

### G2. Recursive features and resource scope

Organize by feature or domain first, then by responsibility inside that scope.
Features may contain smaller features. Meaning, ownership, lifecycle and usage
scope determine the hierarchy; extra levels must represent a useful boundary.
This is the architectural convention adopted by these standards, not a restriction
provided by the TypeScript language itself.

- A definition stays in the smallest scope that owns its meaning. An outer
  composition needing a feature's specialized type, function or result does not
  make that definition global; expose it through the owner's public API.
- Move truly shared concepts to the smallest common scope of their consumers.
  Similar shape or two occurrences alone is not sufficient reason to move them.
- Distinguish features, shared capabilities and composition. Non-ancestor feature
  branches must not depend on one another, even through public APIs. Their common
  scope owns shared contracts; composition coordinates their public operations.
- Children consume explicitly shared ancestor contracts, not an ancestor's
  aggregate barrel or private implementation. Shared capabilities must not depend
  back on child features, including through type references or helper wrappers.
- Crossing nested boundaries must respect every enclosing public API. A public
  grandchild entry does not grant access through its parent's private tree. The
  parent can re-export that API or explicitly expose the child as a public subentry.

```text
projects/
  index.ts                    # Public API of the enclosing feature
  schemas/
    index.ts                  # Shared contracts for child features
    project.ts                # Schema and its inferred type together
  browsing/
    index.ts                  # Query API and browsing-owned types
    schemas.ts
    services/
  editing/
    index.ts
    controllers/
  project-workspace.ts        # Composition using child public APIs
```

Responsibility categories may include constants, schemas, types, components,
services, controllers, state and utils. They are choices, not a required directory
checklist. Start small responsibilities as specifically named files; grow into a
folder when several independently named modules belong together. Do not create
empty categories. Avoid generic utils.ts files; use descriptive helper filenames.
A utils/ folder still contains named helpers, and a stable concept can later own
its own directory. Keep schemas with their inferred types; independent contracts
may live in types/ without duplicating schema-derived definitions.

### G3. Readable files and functions

- Each file must have one main responsibility. Split combined reading, parsing,
  validation, transformation and complex interaction into meaningful modules.
- Keep related code near its owner. A source root should contain entries and a few
  package-level files rather than dozens of unrelated implementations. Subdivide
  independent groups instead of moving the same flat pile into components/ or utils/.
- Small, tightly related local types, constants and helpers may remain with their
  implementation. Do not split every one-line function into a separate file.
- Use named phases and early returns to reduce nesting. Extract meaningful steps
  from long functions rather than using divider comments to simulate modules.
- Roughly 12–15 direct handwritten source files in a directory or roughly 300 lines
  in one handwritten source file prompt a responsibility/readability review. These
  are reminders, never count-based CI failures. Directory counts exclude adjacent
  tests, fixtures, assets and generated files and do not count recursively.
- Explain why related code should stay together when appropriate. Do not create
  meaningless folders, split tightly coupled logic or move existing small files
  solely to meet a threshold. Group code as real complexity grows.
- When moving or extracting code, update public entries, consumers, tests and docs
  together; do not leave two apparently valid implementations behind.

### G4. Public APIs and dependency direction

Every feature boundary must have explicit public module entries, normally index.ts.
Ordinary responsibility folders do not all need a barrel. Within one feature scope,
direct implementation-file imports are valid; entering a nested feature still
crosses that child's boundary.

- New modules use named exports by default. Public APIs use deliberate named
  exports and export type for types; do not indiscriminately export *.
- Entries describe APIs; do not hide business workflows or initialization side
  effects in them. Do not import back through the owning root aggregate barrel.
- Export specialized definitions from their owner rather than relocating them merely
  for outer consumers. A parent can expose a child's API without exposing its internals:

```ts
// projects/browsing/index.ts: explicit child API
export { queryProjects } from './services/query-projects.js';
export type { ProjectQuery } from './schemas.js';

// projects/index.ts: explicit enclosing API
export { queryProjects } from './browsing/index.js';
export type { ProjectQuery } from './browsing/index.js';
```

Consumers outside projects use its public entry, not browsing/services internals.
File-entry declarations in checking tools and the symbols exported by TypeScript
are separate controls; an index.ts alone does not hide other files.

- Use import type for type-only imports. In multi-package projects, the
  [monorepo standards](monorepo-standards.md) own cross-package exports, manifest
  ownership and dependency declarations; apply them alongside these module APIs.
- Keep dependency direction one-way: lower-level modules must not import applications
  or higher-level business code. Fix cycles by correcting ownership, not by copying
  types or hiding dependencies behind dynamic import.
- Separate pure, browser/client and runtime-specific entries. Do not combine
  incompatible environments behind one aggregate entry. Use explicit runtime
  extensions in Node ESM library imports, including .js for emitted JavaScript;
  do not rely on directory resolution. Other environments follow their resolver.
- Preserve framework-required filenames, exports and default exports. Shared
  compiler, lint and formatter settings are authoritative; do not add competing
  local formatting preferences or format unrelated files during a task.

### G5. Constants and configuration

Values expressing business rules, policy or coordinated defaults must be named.
This includes timeouts, retry limits, capacities, versions, status codes, storage
keys and controlled options, not only numbers. Names include meaning and units,
such as REQUEST_TIMEOUT_MS or MAX_DOCUMENT_DEPTH, not TIMEOUT, MAX_SIZE or VALUE_10.

| Scope                             | Ownership                                                  |
| --------------------------------- | ---------------------------------------------------------- |
| One function or file              | A meaningful nearby local constant                         |
| Several consumers in a domain     | That domain's constants/config/schema module               |
| A rule coordinated across modules | One definition exported by the concept's owner             |
| Environment-dependent settings    | Read and validate at the application boundary, then inject |

The same value does not imply the same concept. Independent features may define
independent timeouts; share a constant only when those rules should change together.
Do not build a giant application-wide constants.ts for unrelated policies.

```ts
export const MEDIA_FITS = ['contain', 'cover'] as const;
export type MediaFit = (typeof MEDIA_FITS)[number];
export const DEFAULT_MEDIA_FIT: MediaFit = 'contain';
```

If a runtime schema already defines the choices, reuse its options and inferred
union, or make the schema consume the same list. Consumers reference the default's
owner rather than writing another default. Obvious indices, empty-collection checks,
standard protocol/HTML/ARIA literals and type-constrained branch matches may be
written directly; do not introduce uninformative ZERO or FIRST_INDEX constants.

### G6. Types and data boundaries

- Keep strict TypeScript, including noUncheckedIndexedAccess and
  exactOptionalPropertyTypes. Do not weaken checks locally for convenience.
- Do not use any to bypass type design. Untrusted network, JSON, file and third-party
  values start as unknown and must be validated or narrowed at their boundary.
- Type assertions, double assertions and non-null assertions must not masquerade
  as validation. Necessary adaptations for genuine third-party typing defects stay
  at the boundary with an explanation; do not spread them into business code.
- Exported functions and important cross-module contracts must have explicit input
  and return types. Keep inference for simple local expressions rather than
  restating obvious types.
- Prefer discriminated unions for alternative states instead of multiple booleans
  that permit contradictory combinations.
- Prefer readonly inputs and shared data. Do not mutate caller-owned objects.
  Necessary in-place optimizations must operate on explicitly owned data.
- Define what absent optional fields and business null values mean. Normalize
  cross-system differences at their boundary rather than making each caller guess.
- Use generics for real reuse and preserving type relationships. Do not hide a
  straightforward domain model behind elaborate type gymnastics.

### G7. Naming

| Concept                                       | Convention       |
| --------------------------------------------- | ---------------- |
| Ordinary files and directories                | kebab-case       |
| Types and interfaces                          | PascalCase       |
| Functions and variables                       | camelCase        |
| Shared named constants and fixed option lists | UPPER_SNAKE_CASE |
| Ordinary local const variables                | camelCase        |

Names express domain meaning and actions, such as resolveBindings, parseDocument
or projectSummary. Avoid vague names such as data2, handle, manager and commonHelper.
Framework naming conventions take precedence where required.

### G8. Effects, errors and asynchronous work

Keep validation, filtering, transformations and resolution as deterministic functions
where possible, with explicit dependencies, results and failure behavior. Put I/O,
environment access, time, randomness and storage behind clear boundaries and inject
them when needed. Do not conceal fetching in an otherwise pure helper. Applications
select external implementations and inject capabilities; domain logic does not
select a vendor simply because that provider is currently convenient.

- Expected failures use typed results or domain errors. Do not turn parse failures
  into empty arrays, request failures into success, or reset state to conceal an
  invalid transition.
- Errors must preserve useful identity and diagnostic context. Use a stable domain
  code or meaningful error type, the failed operation and relevant safe identifiers
  when they help locate the source. Do not collapse validation, transport and
  storage failures into one undifferentiated generic failure.
- When wrapping or translating an error, preserve its cause and original diagnostic
  information, including the stack when available. Carry an existing request or
  correlation ID across boundaries when useful; this does not require a tracing
  service or a new error framework for every function.
- A concise user message and a diagnostic error serve different audiences. A generic
  visible message may be appropriate, but must not replace the actionable cause.
  Never put credentials, tokens or private payloads into error messages or logs.
- Catch only where the owner can handle failure, add context or translate boundary
  semantics. Log at the responsible handling boundary, not repeatedly at every layer.
- Asynchronous operations must account for cancellation, stale results, pending
  state cleanup and resource release. Prevent old operations overwriting newer
  state and avoid retaining rejected or hung work as permanently pending state.

### G9. Comments, tests and maintenance

Comments explain reasons, constraints and non-obvious tradeoffs; names and structure
explain straightforward execution. Public APIs document parameter semantics,
defaults, errors and important limits. Remove dead implementations and large blocks
of commented-out code instead of leaving multiple apparent execution paths.

Tests verify rules, boundaries and observable behavior rather than mirroring the
implementation. Shared fixtures/builders belong to their domain. Do not mock away
the components under test, important defaults and real schemas. Include empty data,
invalid inputs, failure identity/context, state transitions and relevant edge cases.
Tests themselves must be organized by coherent behavior scenarios.

When a foundational schema/type changes, inspect all consumers. When extracting
shared logic, test both common rules and actual call paths so old branches do not
silently survive at callers. Update APIs, schemas, tests and docs together. Run the
project's required checks; a green result only establishes their documented coverage.

### G10. Requirements, automation and review

Architectural and behavioral requirements remain requirements even when they need
human review. Do not describe semantic judgments as lint guarantees. Each project
must state which checks are implemented, whether boundary declarations are opt-in,
which inputs are scanned and where static analysis stops. Undeclared entry contracts,
computed imports, custom loaders and runtime resource ownership need review unless
an explicit tool actually covers them.

Keep common checks in shared tooling rather than copying checkers or thresholds
per module. New hard checks must include valid-use and rejection tests. Code size
reminders are advisory; do not mechanically refactor existing code to satisfy them.

Before submitting, review:

1. Does this duplicate a rule, type or default that already has an owner?
2. Is each definition in its smallest owning scope with a clear dependency direction?
3. Are responsibilities grouped and large flows split into meaningful steps?
4. Are policy values named with clear units and scope?
5. Are inputs genuinely validated without assertions, swallowed errors or fallback
   values concealing a defect? Can failures be traced to their source?
6. Did public APIs, schemas, tests, docs and all consumers change together?
7. Can a new reader find the entry, main flow and place to make a change without a
   long explanation of the directory structure?
