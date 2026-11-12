# Package development

Use the versions in `.node-version` and `package.json`. Run a frozen install in
the workspace root before development.

```sh
pnpm install --frozen-lockfile
pnpm validate
```

| Command                            | Scope and behavior                                                         |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `pnpm build`                       | Check source and build packages in dependency order                        |
| `pnpm dev`                         | Build package outputs and start their development watches                  |
| `pnpm clean`                       | Remove package build and coverage output                                   |
| `pnpm check:workspace --source`    | Check package contracts and imports before build                           |
| `pnpm check:workspace`             | Also check that declared export targets exist                              |
| `pnpm lint`, `pnpm lint:fix`       | Check source or apply available lint fixes                                 |
| `pnpm format:check`, `pnpm format` | Check or apply formatting                                                  |
| `pnpm typecheck`                   | Build package inputs and check types                                       |
| `pnpm test`, `pnpm test:tooling`   | Test the packages and tooling, or just the tooling                         |
| `pnpm test:watch`                  | Watch package tests using existing dependency builds                       |
| `pnpm test:coverage`               | Build dependencies and run package coverage                                |
| `pnpm validate`                    | Run source policy, one build, export checks, format, lint, types and tests |

CI runs a frozen installation followed by `pnpm validate`. Builds and tests use
the workspace's local dependencies and source.

## Add a package

Use `packages/example-library` as a starting point. Create a sibling folder
with the same layout and a distinct package name in the root scope. Copy its
tracked source, configs and tests, then adapt the public exports, README and
sample behavior. Run `pnpm install` when changing the workspace or dependencies
and commit the resulting lockfile.

To consume another local package, declare the dependency from the consumer:

```sh
pnpm --filter <consumer> add <package>@workspace:*
```

Import from the public package name. Use `pnpm build` to build the dependency
first, and `pnpm test` to check the consumer. The root automatically discovers
new packages under `packages/*`. See the [repository conventions](repository-conventions.md).
