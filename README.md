# Frontend workspace foundation

This repository provides the pinned Node/pnpm toolchain, layered workspace policy,
shared TypeScript and test configuration, and dependency-aware task runners.

Reusable libraries belong in `packages/shared`, optional website-domain packages
in `packages/site`, concrete provider implementations in `packages/adapters`, and
copyable starters in `packages/templates`. Consuming applications are generated
into independent target projects.

Install with `pnpm install --frozen-lockfile`, then run `pnpm validate`.
The task runners discover the workspaces that are present; an empty capability
layer does not require placeholder packages or application hosts.

The maintained guides under `docs` define the contracts implemented by the
framework capabilities. Each package supplies its own API and behavior tests.
