# Source and generated-project verification

This guide is for maintainers. Run commands at the source root unless stated
otherwise. [Commands](commands.md) defines their exact behavior; package READMEs
own capability-specific acceptance. Use the pinned toolchain and prepare the
intended inputs explicitly before checks that consume generated resources.

## Choose checks by behavior

| Change                                      | Required evidence                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation only                          | Formatting, local links/anchors, CLI examples and the relevant task route; inspect generated guides when their delivery inputs change |
| Package code or root configuration          | pnpm validate, meaningful owning tests and public-entry/export coverage                                                               |
| Next async UI, styling, theme or navigation | Applicable production browser tests in addition to validate                                                                           |
| Template/generator or build conventions     | In-place source checks and independent installation, prepare, build and relevant browser behavior of real public CLI outputs          |
| Dependency/layer enforcement                | Both rejected violations and legitimate cases, including transitive/test/dev dependencies                                             |
| Concrete provider integration               | Neutral adapter tests; claim live-provider qualification only after an explicitly configured live check                               |

Do not edit runtime behavior just to make a documentation proposal true. Conversely,
a change to delivery manifests or license/guide copying is a generator change,
even if most edited files are prose.

## Source workspace

```sh
pnpm install --frozen-lockfile
pnpm bootstrap --include-templates --source default
pnpm validate
pnpm test:templates --source-only
```

Validate builds libraries once, then checks prepared-input freshness, exports,
format/lint/types, tooling and package tests, and builds source app templates. It
does not install, prepare, run browsers, use real cloud resources or deploy.

For an affected host, use pnpm test:e2e --app template-plain-next or
pnpm test:e2e --app template-studio. The source-template phase also covers fixed
light/dark policies, resource/default/custom behavior and page/root recovery.
Verification refuses to overwrite preexisting local custom inputs. Respect that
refusal; use a separate checkout rather than resetting another developer's inputs.

## GitHub Actions

Pushes to `main` and pull requests targeting `main` run **Standard** under the
required `validate` check. In Actions, select **Validate**, then **Run workflow**
to choose any profile manually. Manual runs report their profile in the check
name so they cannot replace the automatic check required for merging.

| Profile  | Checks                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| Quick    | Frozen installation, source workspace rules and formatting                                                              |
| Standard | Quick checks plus lint and tests for changed workspaces, with library builds and default input preparation where needed |
| Full     | Default input preparation, `pnpm validate`, independent Node workspace verification and the Playwright template suite   |

Standard compares the checked-out PR merge result to its base commit, a push to
its previous tip, and a manual run to the selected commit's first parent. It
checks every workspace when the comparison is unavailable or shared configuration
changes. Shared configuration includes root manifests, the lockfile, root build,
lint and test configs, `tooling/` and GitHub workflows. When there are no workspace
changes, the status check still reports the Quick checks. Full covers repo-level
tooling tests, workspace dependents and independent clone verification.

## Independent generated projects

Run `pnpm test:node-clone` to generate the Node preset and verify both commits
using detached checkouts with frozen installation. The check also builds and
tests the generated library, adds a local consumer, imports its built public API
in Node and checks dependency and export violations.

For frontend projects:

```sh
pnpm test:templates --clone-only
```

This calls the public repo:clone and template:clone commands for default Web,
appended Studio, bare generation and an app appended to bare. It verifies changed
names/scopes, independently committed stages, production/browser behavior,
default/custom resources, frozen reinstalls and output ownership. The complete
pnpm test:templates runs source and independent phases.

When changing delivery/build assumptions, move an actual generated project away
from its source, remove disposable dependencies/build outputs, then verify frozen
installation, explicit preparation, development and build. Preserve .local data.
For example, in the generated project root:

```sh
pnpm install --frozen-lockfile
pnpm bootstrap --source auto
pnpm build --all
pnpm validate
```

An offline reinstall requires a populated store and does not establish anonymous
cold-download availability. A source build alone does not qualify a generated
project; a valid Markdown link alone does not validate the documented command.
Record important limitations alongside actual results in the external engineering
workspace. Temporary verification directories are task-owned and printed by the
harness; retain failure evidence without committing installed/build output.
