# Template rules

- Use the pinned pnpm version, Node policy, and one lockfile.
- Root owns tooling; apps own runnable hosts; packages own reusable capabilities. Keep names and examples domain-neutral.
- Declare workspaceKind and preserve its required scripts/files. Root naming defines the package scope. Use workspace:* for internal dependencies and declare external runtime dependencies in the owning manifest.
- Consume public exports. Generic packages cannot import application internals or framework integration.
- Shared strictness belongs in tsconfig.base.json; Node and browser environments use separate compiler/test configuration.
- Use packages/template as the Node-library format. Tests cover source behavior and public built exports.
- Run pnpm validate for code/configuration changes and verify clean output builds when changing package/build conventions.
