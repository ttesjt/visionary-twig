# Repository conventions

Node libraries live under `packages/*` and declare `workspaceKind: "node-library"`.
They use private, scoped ESM manifests and explicit exports for built JavaScript
and types. Use Node runtime extensions in relative source imports. The shared
TypeScript configuration resolves modules as Node ESM does, and build output
goes to each package's `dist` directory.

Each library has a README, `src/index.ts`, a Node TypeScript config, a separate
build config and a Vitest config. Vitest and lint cover .test and .spec files with
.ts, .tsx, .mts or .cts extensions. The build excludes those tests. The example
library shows the package script contract. Use the [development guide](development.md)
for root commands and the [monorepo standards](monorepo-standards.md) for package
dependency rules.

The workspace checker verifies package shape, scripts, import ownership,
declared dependencies and public workspace paths. After build it checks the
export targets on disk. Package-local `#` aliases use the workspace's
`package.json` imports map. Local targets stay inside that package, and external
targets follow the same dependency and public export checks for every declared
condition. The `workspaceFeatures` and `workspaceEntrypoints`
declarations opt into [feature and entry checks](feature-boundaries.md).
Use review and tests for behavior, runtime compatibility and decisions that
depend on the package's purpose.
