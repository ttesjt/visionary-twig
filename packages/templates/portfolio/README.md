# Portfolio template

A localized Next.js starter with Home, About, Projects and Contact pages.

From the source workspace:

```sh
pnpm app:prepare --app template-portfolio --source default
pnpm dev --app template-portfolio
pnpm test:e2e --app template-portfolio
```

Generate an independent workspace or add it to an existing one:

```sh
pnpm repo:clone --output ../portfolio-project --template portfolio --app-name portfolio
pnpm template:clone --target ../my-project --name portfolio --template portfolio
pnpm repo:clone --output ../portfolio-demo --template portfolio --app-name portfolio --setup-with-demo
```

See the [delivered README](template/README.md) for site customization.
The [feature guide](template/docs/feature-modules.md) explains page ownership,
public module entries and cross-template transfer.
The [project data guide](template/docs/project-data.md) explains both SQL-backed
Projects and the project-file Content example, including how to keep one source.

The source workspace previews fictional projects. The generated app adds the
SQLite/files and D1/R2 adapters and an explicit data setup command.

## Demo ownership and local setup

`template/demo/` owns the eight-project JSON index, one raw Puck document,
global `projects-demo` and page-only `field-notes` Text namespaces, and public
media. Both Text namespaces have English/Chinese dictionaries. The source
preview declares these paths in `src/site/project-data.ts`. Source-fixture
verification lives in `template/test/`. Both directories are excluded from
ordinary generated apps.

The generated `project-data.ts` points at app-owned inputs. Normal generation
delivers an empty index and no sample pages, dictionary or media. `--setup`
also creates empty local storage. `--setup-with-demo` selects explicit file
mappings into the app's `content/default/` and `public/`, registers the selected
page and Text namespaces, then creates and populates local storage in both the
candidate and the final target.

`readProjectDatasets` composes the existing Content/Text readers into localized
catalogs and pages. SQL import consumes those same validated values. Puck bindings
and context are preserved; SQL media URLs use the authorized BFF. Client bundles
receive declarations and prepared resource identities, never the demo payload.

## Remove the appearance preview

The optional preview, its bootstrap/state and all related tests live in
`src/demo/appearance`. Remove its import and two explicit mounts from
`src/app/[locale]/layout.tsx`, then delete that folder. The mounts are
`<AppearanceDemoBootstrap />` and PortfolioFrame's
`preferenceExtensions={<AppearanceDemoPicker />}` prop. No infra/site/resource
changes are needed; language and theme controls remain.

`src/styles/index.ts` selects the static styles. Mono works without any preview
attribute, script or browser storage. For basic styling remove the shared Mono
import and the site's `mono.css`, `projects/mono.css`, `contact/mono.css` imports.
Custom CSS and token names are unrestricted. Component defaults use public
`--ui-*` tokens; map yours to them or replace the component styles as needed.
Project requests, readiness and mounted content do not depend on the preview.
