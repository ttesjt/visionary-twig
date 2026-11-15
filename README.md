# Visionary Twig

A ready-to-use frontend monorepo with shared tooling, coding standards, and
website templates built with Next.js. A separate preset starts a standalone
TypeScript workspace for Node.js.

![visionary-twig. A curious bird watches twigs come together into a nest.](.github/assets/visionary-twig.png)

## Contents

- [About](#about)
- [Getting started](#getting-started)
- [Usage](#usage)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## About

A coding agent can start a web project quickly. It takes longer to build a
codebase that people can understand, extend, and maintain as it grows.
Clear package boundaries, consistent ways to implement common features, and
automated checks all take time to establish. Those decisions are reusable across
projects. This project gives you that foundation in a pnpm monorepo, so you can spend more time building the site and creating its content.

Visionary Twig includes a scalable monorepo structure, documented package boundaries, coding standards, shared build and test commands,
and CI.

Other than the infrastructures, the repository also ships Next.js templates on top of the shared foundation.
The web starter lets you customize text, settings, and sample content in JSON.
An optional Studio project provides local visual editing and preview.

### Built with

- TypeScript and pnpm workspaces
- Next.js and React in the supplied templates, with Puck in Studio
- Vitest for unit and integration tests, with Playwright for browser tests

## Getting started

### Prerequisites

- **Node.js 24.15 or newer within the 24.x line.** The workspace supports
  `>=24.15.0 <25`; the locked DOM test dependencies set the minimum for Node 24.
  CI uses the version in [`.node-version`](.node-version). [Install Node.js](https://nodejs.org/en/download).
- **pnpm 10.28.0.** The workspace enforces the version in
  [`package.json`](package.json) so local installs, generated workspaces and CI
  use the same package manager. [Install pnpm](https://pnpm.io/10.x/installation).
- **Git with a configured name and email.** Generation creates commits in the
  new repository. [Install Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
  and [configure your Git identity](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup#_your_identity).

### Create a web app

From a checkout of this repository, run:

```sh
pnpm install --frozen-lockfile
pnpm repo:clone --output ../my-project --name @example/frontend
cd ../my-project
pnpm dev --app web
```

Generation installs the new workspace, prepares the default resources and
validates it. Open the URL printed by the dev command. Start with the generated
root README and `apps/web/README.md` to take over the site.

## Usage

Run these commands from the template repository:

| I want to…                                             | Command                                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Create a Next.js workspace with an app in `apps/web`   | `pnpm repo:clone --output ../my-project`                                     |
| Create a frontend workspace with no apps               | `pnpm repo:clone --output ../bare --bare`                                    |
| Create a TypeScript workspace with one Node library    | `pnpm repo:clone --preset node --output ../tools --name @example/tools`      |
| Add Studio to an existing generated frontend workspace | `pnpm template:clone --target ../my-project --name editor --template studio` |

Generated workspaces run independently of this checkout and include their own
README, `AGENTS.md`, task-based docs, CI and lockfile. Each app is added as a
separate commit. The generator preserves existing app and package source.
See the [workspace creation and extension guide](docs/template-repository/using-template.md)
and [available templates](packages/templates/README.md).

## Documentation

Start with the [task-based documentation index](docs/README.md).

- **Develop a generated project.** Use that project's root README and
  `docs/README.md`, then the README in the app or package you want to change.
- **Work with a coding agent.** Start at the repository's `AGENTS.md` for
  ownership, code standards and verification. [Source repository agent guide](AGENTS.md).
- **Understand the framework.** Learn what lives in shared packages, site
  packages, adapters and templates. [Architecture guide](docs/template-repository/architecture.md).
- **Use text, app config or content.** Learn how resources are prepared and
  loaded. [Resource initialization](docs/common/resource-initialization.md).

## Contributing

Work from the template repository root:

```sh
pnpm bootstrap --include-templates --source default
pnpm validate
```

Use `pnpm dev --app template-plain-next` or `pnpm dev --app template-studio`
to run a source template. Install Chromium with `pnpm exec playwright install chromium`
for `pnpm test:templates`. [Contributor workflow](docs/template-repository/contributing.md) ·
[Verification guide](docs/template-repository/verification.md).

## License

The source repository is available under the [MIT License](LICENSE). We also
offer our own code, documentation, and assets delivered by the workspace and
template generators under [MIT No Attribution (MIT-0)](scaffolds/LICENSE-MIT-0).

Generated workspaces start with MIT-0. You can replace or remove the default
license, choose your own copyright notice, or keep your project private.
Attribution to Visionary Twig is optional under MIT-0. Third-party code and
assets retain their own licenses.

README structure inspired by [Best-README-Template](https://github.com/othneildrew/Best-README-Template).
