# Application and library starting points

The app templates are live pnpm workspaces: their source, configs and dependencies
resolve in this directory. Their unique package names and ports separate them
from the consuming apps. The node-library directory remains an inactive scaffold.
Templates are starting points, never runtime dependencies of other workspaces.

| Source       | Package                       | Dev / browser ports | Generated destination           |
| ------------ | ----------------------------- | ------------------- | ------------------------------- |
| studio       | @frontend/template-studio     | 3201 / 3221         | apps/studio                     |
| plain-next   | @frontend/template-plain-next | 3203 / 3223         | apps/plain                      |
| node-library | inactive                      | none                | packages/shared/example-library |

From the root run pnpm install --frozen-lockfile. For the prepared starters,
run pnpm bootstrap --include-templates --source default to build dependencies
and prepare Text, AppConfig and Content. Run `pnpm dev --app template-plain-next`
or `pnpm dev --app template-studio`.
Those runners build/watch shared libraries first.
After the dependency build, pnpm build inside each template works normally.
Root pnpm build --all --include-templates explicitly builds all source templates. pnpm validate always builds them when present.

## Generate a new project or add an app

```sh
pnpm repo:clone --output ../new-frontend --name @example/frontend
pnpm repo:clone --output ../bare --bare
pnpm repo:clone --output ../tools --template studio --app-name editor
pnpm template:clone --target ../new-frontend --name editor --template studio
pnpm library:clone --output ../library-workspace --name @example/tools
```

Default creation supplies one plain-next app in apps/web. Bare mode supplies the
shared framework and empty app/site/adapter layers. App injection requires a name
and creates one complete commit with required additions. Existing package source,
README and custom inputs are preserved; conflicting contracts or paths fail.
See [the generation protocol](../../docs/template-repository/generation.md).

## Template contract

Each app declares template.config.mjs:

- type: app or library, independent of framework workspaceKind.
- destination: apps/<id> or packages/shared/<id>.
- requires: initializer prerequisites, resolved and cycle-checked; public app injection selects exactly one app.
- packages: optional extra shared/site/adapter delivery roots; normal runtime dependencies remain in manifests and obey layer policy.
- initialize: optional own script exporting initialize(context).
- files: optional target-relative file to template-relative source mapping.
- root: optional scripts, devDependencies and catalog contributions.
- primary: optional preferred default app; app contains this Next template's generated ports.

Context supplies id, appId, projectName, scope, sourceDirectory, targetDirectory,
config, mapping.packages, mapping.directories and target-bound files helpers:
editJson, editText, write and rootReference. Hooks return additional root
requirements. Conflicting contributions fail; hooks do not overwrite root config,
install dependencies or update lockfiles. Shared packages need no initializer.

Next hooks reuse the common Next initializer for tsconfig, Vitest, Playwright and
host metadata. Each template owns its hook and generated README. A future Vite
starter would own its Vite adjustments and app policy; no Vite starter is supplied.

## Verification

Run `pnpm test:templates` to exercise the source starters, a default two-app clone
and a standalone plain-next clone. Checks use renamed scopes and app IDs,
production Chromium, fixed themes and frozen offline reinstalls. Event delivery
tests explicitly enable tracking in a disposable clone and intercept its endpoint.
Use `--source-only` or `--clone-only` to select one phase. Generated verification
projects live in a printed task-owned temporary directory outside this source repo.

## Prepared resources

Both starters prepare Text, AppConfig and Content from their own defaults.
For a partial override, place a flat dictionary in
`.local/content/text/en/main.json`, then run `pnpm app:prepare` in that host.
Use `.local/config/app.json` for settings and `.local/content/data/base.json` for base
content. The initializer maps preparation commands to the generated app ID.
Generated files and private inputs stay out of the clone.

Verification exercises custom inputs in development and starts a production build
with its source and prepared JSON moved aside. On success or failure it restores
the original files. Source verification requires default prepared inputs and refuses
to overwrite a preexisting `.local` directory.

The seed lockfile maps root and workspace dependency names and rebases internal
links. The one initial install explicitly allows reconciliation of new hook
requirements, including under CI=true. Generated CI and the verification reinstall
use a frozen lockfile. A regression fixture verifies that renamed root workspace
dependencies also support a first frozen install without prior reconciliation.

## Plain Next.js

The welcome page uses the Layout resource readers and shared styles. Examples
exercise theme selection, SWR, explicit event delivery and localized content.

```sh
pnpm dev --app template-plain-next
pnpm template:clone --output ../plain-project --templates plain-next
```

Its initializer only adds prepared-input commands when a template declares those
capabilities. Standalone clone verification covers plain-next separately, so it
cannot rely on another host to supply preparation packages. See
[plain-next](plain-next/README.md) for retained capabilities and source ports.

The plain-next Text examples validate SSR snapshots, true client-only loading and
atomic language changes. See [resource initialization](../../docs/common/resource-initialization.md).

For lazy sections, reuse the nearest Provider. See the [starter guide](plain-next/README.md#adding-a-namespace-on-demand) for an example.
