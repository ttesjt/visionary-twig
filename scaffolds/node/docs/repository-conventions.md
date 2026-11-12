# Repository conventions

Node libraries live under `packages/*` and declare `workspaceKind: "node-library"`.
They use private, scoped ESM manifests and explicit exports for built JavaScript
and types. Use Node runtime extensions in relative source imports. Root commands
build local dependencies before consuming their public outputs.

Each library has a README, `src/index.ts`, a Node TypeScript config, a separate
build config, and a Vitest config. See the [development guide](development.md)
for the workflow and the [monorepo standards](monorepo-standards.md) for package
dependency rules.
