# Monorepo generation contract

The source repository maintains framework sources and template recipes. User apps
are generated into independent external pnpm monorepos. Source Git history,
remotes, worktree metadata, templates and maintenance tools are not inherited.

## Public operations

```sh
pnpm repo:clone --output ../site
pnpm repo:clone --output ../framework --bare --name @example/framework
pnpm repo:clone --preset node --output ../tools --name @example/tools
pnpm repo:clone --output ../editor --template studio --app-name workbench
pnpm template:clone --target ../site --name editor --template studio
```

The frontend preset defaults to one plain-next app named web. --bare only creates the
framework. --template selects one app; --app-name renames its destination.
--name in repo:clone defines the root package identity/scope. In template:clone,
--name is a required app directory ID with no default; its root scope is inherited.
Library templates use library:clone --output <new-directory> with optional
--name @scope/project. They use the same framework baseline and a separate library
commit, remain valid targets for later app addition, and never expand into apps/.

Select `--preset node` to create a pure TypeScript workspace. It initializes
`packages/*` and expands `node-library` into `packages/example-library`. The
default root name is `@workspace/starter`. The Node preset uses `--name`,
`--offline`, and `--no-verify`. The frontend options `--bare`, `--template`,
`--app-name`, and `--browser` require the default or explicit `--preset frontend`.

Both frontend commands accept --offline (populated store), --no-verify (skip aggregate
validate, still reconcile and verify installation/prepare), and --browser (also
production and fixed-theme browser checks; requires verification). --help and
--list inspect available app choices without changing targets.

## Ownership and inputs

Each preset has an explicit foundation allowlist. The frontend allowlist lives
in `scaffolds/monorepo/delivery.json`, and the Node allowlist in
`scaffolds/node/delivery.json`. package.base.json owns target scripts/tool dependencies; toolchain
versions come from the source package.json and catalog. Workspace paths are apps,
shared, site and adapters, with no template path. Default shared delivery includes
all neutral shared packages; empty app/site/adapter directories have README guides.
The Node foundation delivers NodeNext configuration, package policy and tasks, CI,
and package development guides. Shared compiler, lint, testing, policy and
generation mechanisms have one implementation.

Templates own template.config.mjs and optional local initializer. The source
manifest declares ordinary dependencies, including any site packages needed by
the selected template. Studio delivery adds `packages/site/studio`. If an app ID
matches a delivered site package name, the app manifest uses an `-app` suffix.
For example, a Studio app with ID `studio` lives at `apps/studio` and uses
`@<scope>/studio-app`. The config.packages field declares
extra packages needed by the generated host. Those declarations are delivery
roots, not runtime edges that exempt layers. Resolve test/peer/optional dependency
closures too. Shared/site/templates cannot acquire concrete provider dependencies;
adapters consume neutral ports; apps own provider selection and injection.

Hooks operate only on the new app and return root scripts/devDependencies/catalog
contributions. They never install, commit or edit root files. Common relocation
is supplied by templates/initializers/next.mjs. Prepared defaults/custom/generated
keep their existing lifecycle; private/default source selection never becomes a
runtime behavior. Local inputs and previous generated/build outputs are excluded.

## Existing targets and conflicts

App addition requires a generated-workspace contract record, matching root identity,
the frontend preset, a clean Git worktree/index (ignored personal files allowed), and an available Git
identity. Target must be the repository root. A generator lock and HEAD/status
checks prevent concurrent tasks publishing stale changes.

New repo/app/file destinations are exclusive, including broken symlinks. Existing
packages are reusable only with known delivery identity and compatible public
manifest contracts. Their implementation is never copied over or reformatted.
If a package moved from shared to site, an existing copy with the same directory
name can be reused at its recorded shared path.
Root contributions merge named keys; conflicts fail instead of replacing user
settings. Existing README/docs/default-app selection stay user-owned. New ports
avoid all declared existing app dev/test ports.

Source provenance records commit plus dirty state, not a dependency on source Git
objects. .workspace-template.json tracks schema version, package identities and app
origins without local absolute paths, secrets or personal inputs. It is not an
automatic framework update protocol.

## Qualification and commits

Each stage has matching manifests/catalog/lockfile. A seed retains only the pnpm v9
resolution closure required by selected importers, including optional platforms and
peer variants; unrelated provider/private records are not copied. During app addition,
existing target importers/pins take precedence over source seeds. Node generation
resolves Vitest and its coverage provider in the target so optional DOM peers
from the source lockfile do not become dependencies.

Creation qualifies an isolated bare candidate, then publishes source into an
exclusively created directory, performs a target frozen install and initializes
its own main history. App addition qualifies a clone of target HEAD away from
.local inputs, publishes only its exact changed paths and bootstraps the new target
app before committing. Validation prepares disposable defaults in the candidate;
existing target app custom/generated data is not reprepared.

```text
chore(workspace): initialize frontend monorepo
feat(web): initialize from plain-next
feat(editor): initialize from studio
```

The Node history has a TypeScript workspace baseline and a second commit for
`example-library`. Both install with their own lockfile. Node qualification uses
the package-only validate task and the output contains its own CI workflow.
If library qualification fails, the baseline remains available. Retry generation
into a new directory after resolving the error.

The first commit is independently installable. Each app commit includes necessary
new shared/site/adapter packages, root contributions, provenance and lockfile.
Only task-owned paths are staged. Git hooks/signing remain active. Failure does not
create an app commit, reset history, clean user data or overwrite concurrent edits.
A successful bare workspace remains available if its later default-app step fails.
Disposable installed outputs may remain after an interrupted operation; inspect a
stale lock rather than deleting another process's lock automatically.

## Documentation delivery and acceptance

Common standards live once in docs/common. Source guides live here. Target-specific
README/AGENTS/guides live in the frontend and Node scaffolds; each app recipe owns its delivered
README. Package docs/licenses travel with their selected package. Links are mapped
through the same source/destination plan and checked in target coordinates. Existing
user docs are not synchronized on each app addition.

Both workspace presets copy the [scaffold's MIT-0 license](../../scaffolds/LICENSE-MIT-0)
to the generated root `LICENSE` and declare MIT-0 in the root manifest. Workspace owners can
choose their project's license. App addition preserves the target's root license
choice. Third-party notices and license files travel with their owning packages.

Verify real public bare/default/renamed/Studio flows, repeated app addition, conflict
refusals, hooks/rollback/custom preservation, per-stage frozen installation, and
source-hidden preparation/development/build. Source pnpm validate covers policy and
behavior regressions. Run `pnpm test:node-clone` for the independent Node
installation, build, test and consumer checks. `pnpm test:templates` exercises real production browser, resources,
locale, tracking isolation and page/root error recovery. Temporary verification
projects are printed by the harness and retained for inspecting failures.

Local Markdown acceptance checks file destinations and ATX heading/explicit HTML
ID fragments, including encoded paths, inline/image and defined reference links.
Fenced and inline code, external URLs and ignored build/local output are not
crawled. The same checker is used by bare creation, application/library addition
and public-artifact verification. New foundations check all delivered guides;
addition checks only incoming package/app documentation against the complete target.
Existing user guides are neither rewritten nor required to be complete before a
new app can be added. Documentation does not add packages outside the delivery plan.
