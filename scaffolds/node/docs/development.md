# Package development

Use `pnpm install --frozen-lockfile` to install from the root lockfile.
Use `pnpm dev` to build packages and start their watches. Run `pnpm validate`
before sharing a change.

## Add a package

Use `packages/example-library` as a starting point. Create a new sibling with its own
package name, source, tests and README. Keep the shared configuration references
relative to its directory. Use `pnpm --filter <consumer> add <package>@workspace:*`
to declare a local runtime dependency. Import it by its package name.

See [repository conventions](repository-conventions.md) for the package contract.
