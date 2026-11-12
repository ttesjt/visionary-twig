# Workspace rules

Use the pinned Node/pnpm versions and one root lockfile. Root owns tooling;
apps own runnable hosts, actual content and external integrations. Shared packages
own neutral capabilities; site packages own domain behavior; adapters implement
neutral interfaces. Shared/site packages must not depend on concrete adapters.

Use docs/README.md to find the task owner. Follow docs/documentation-standards.md
when writing or moving guides.

Read docs/code-standards.md and docs/frontend-code-standards.md for portable
TypeScript and frontend requirements,
docs/monorepo-standards.md for package collaboration and pnpm integration,
docs/repository-conventions.md for paths, supported workspace kinds and check
coverage, and docs/package-conventions.md for required scripts/files and builds.
Keep feature ownership, public APIs, strict types and actionable error diagnostics.
Apply review rules beyond automated coverage. Styles workspaces and React packages
can expose explicit CSS entries. Apps select entries and own CSS in src/styles/.

Prepare declared resources explicitly before dev/build. Preserve .local inputs.
Run pnpm validate and relevant browser tests; build libraries before consumers.
Engineering records belong outside product source and are never a build dependency.
