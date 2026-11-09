# Contributing to the source repository

This guide is for framework, adapter, template, tooling and documentation changes.
For a generated user's website, follow that project's README instead.

## Locate the owner

Read [AGENTS](../../AGENTS.md), applicable nested rules and the
[task index](../README.md). Use [architecture](architecture.md),
[package conventions](package-conventions.md) and the package's public README to
identify whether the change is neutral capability, domain behavior, concrete
provider integration, template composition or root tooling.

Follow [code standards](../common/code-standards.md),
[monorepo standards](../common/monorepo-standards.md),
[repository conventions](repository-conventions.md) and
[documentation standards](../common/documentation-standards.md). Do not move an
application preference into shared defaults merely because it could be reused.

## Prepare an isolated checkout

Use the toolchain pinned in the root package.json and .node-version.

From the source repository root:

```sh
pnpm install --frozen-lockfile
pnpm bootstrap --include-templates --source default
pnpm dev --app template-plain-next
```

For Studio, select template-studio instead. Bootstrap writes prepared outputs;
source default explicitly selects tracked inputs. Use source auto for intentional
local overrides and preserve existing .local files. No database migration, cloud
operation or deployment is part of these commands.

## Implement and deliver

Cross-package code and tests use public exports. Adapters implement neutral ports;
generated apps choose and inject concrete providers. Template initializers modify
only their own new target and return root contributions; generic generation owns
installation, qualification and commits. See [the generation contract](generation.md).

Keep changes scoped by responsibility. Application paths, site packages and neutral
framework/tooling changes stay independently reviewable. Do not add consuming apps
to this repository. Preserve user custom inputs and unrelated worktrees.

Update the owning API/guide and meaningful tests with a contract change. Use
[verification](verification.md) to choose the checks, report actual coverage and
leave engineering evidence outside product source. Integration uses an agreed
rebase followed by fast-forward; do not rewrite shared history or synchronize other
worktrees without authorization.
