# Architecture

## Ownership

Root orchestrates private scoped ESM workspaces. Apps own runnable hosts and framework integration. Packages own reusable capabilities and public exports. Source dependencies must be declared as dependencies, optionalDependencies, or peerDependencies; tests and tooling can use devDependencies. Internal dependencies use workspace:*.

## Checks and outputs

workspaceKind determines required scripts/files. Source policy checks run before builds; export checks run afterward. Code workspaces cannot omit tests/typechecks, while CSS-only workspaces need only applicable format checks. The policy checker is tested with isolated filesystem fixtures, including another package scope.

Libraries emit ESM/declarations/maps to dist. Root commands build public exports before consumer checks and tests. Node-library relative imports use explicit runtime extensions. Shared compiler settings separate strictness from environment-specific globals.
