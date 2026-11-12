# Workspace rules

Use the pinned Node and pnpm versions and one root lockfile. Workspaces live in
`packages/*`. Each package declares its own dependencies and exposes a public API
through its exports.

Use the [workspace guides](docs/README.md) to find the relevant contract. Follow
the TypeScript, package, and documentation standards in those guides. Keep
private inputs outside tracked source and engineering records outside product
source. Run `pnpm validate` after changing code or tooling.
