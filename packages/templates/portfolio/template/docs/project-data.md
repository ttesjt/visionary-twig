# Choose a project data source

This guide is for the owner of a generated Portfolio app. Paths below are
relative to that app directory.

|                 | SQL Projects                                              | Project-file example                               |
| --------------- | --------------------------------------------------------- | -------------------------------------------------- |
| List            | `/projects`                                               | `/examples/content-projects`                       |
| Details         | `/projects/[slug]`                                        | `/examples/content-projects/[slug]`                |
| Content updates | Publish database records independently                    | Prepare and deploy updated files                   |
| Queries         | SQL and a read-only BFF paginate results                  | Content loads the index once and filters in memory |
| Media           | Authorized SQL/object-storage references                  | Public assets                                      |
| Useful for      | Independent publishing, larger catalogs, frequent updates | Small catalogs maintained with the site            |

The two sources use the same project cards, category controls, pagination,
detail states, Puck renderer and language handling. Their source owners supply
the data, route links and media URLs.

## Use project files

An ordinary clone starts with an empty project index. Run `pnpm app:prepare`
from this app directory, then use the workspace's dev
command with your app ID. Open `/examples/content-projects`. A database setup
is required for the SQL routes.

Edit `content/default/data/project-files/projects.json` for the index and
`field-notes.json` for the sample Puck page. Private overrides go in
`.local/content/data/project-files/` using the same filenames. Rerun
`pnpm app:prepare` after edits. Generated files under `.generated/` are build
outputs.

The Layout scope prepares `base` and `projects` before displaying the site.
This means the index is available throughout the app. Filtering and pagination
reuse it. `projects.pageSize` in AppConfig controls capacity for both sources.
The list preserves category/page in its URL, so refreshes and shared links
restore the selected view.

Each Puck page has its own Content namespace. The route looks up its slug,
prepares that scope on the server and passes the snapshot to a page
ContentProvider. That reader inherits the global index. A missing client
snapshot is loaded by ResourceScope before the detail appears. Only the
requested page document is prepared.

Use explicit Text references for localized titles, summaries, alt text and
context values. The file page keeps its raw document and bindings. Its context
is resolved against the current Text reader before the shared Puck renderer
uses it.

Preparation checks every nested `$text` marker in the page document and context,
including markers inside arrays, and reports invalid shapes at their full field
paths. If an already delivered page fails Text resolution at runtime, the
detail keeps its project title and summary and shows that the write-up is
unavailable. Server diagnostics retain the underlying error.

### Add a project or a page

1. Add the project to the index with a distinct ID and slug, category IDs,
   ordering and optional badge. Media object keys are paths relative to
   `public/`, for example `samples/portfolio/lake.jpg`.
2. Add referenced labels to the Text catalogs or provide plain strings.
3. For a full write-up, add its JSON file and one declaration to
   `PROJECT_FILE_PAGES` in `src/site/project-data.ts`. The optional Field Notes
   demo shows a complete declaration. Its slug, namespace and filename generate the schema registration,
   input paths, identity check and detail scope.
4. Prepare resources and check both languages.

The resource inputs and paths live in `resources.ts` and `constants.ts`.
`preparation.ts` adds prepare-time document inspection. `catalog.ts` owns the
normalized in-memory queries, and `pages.server.ts` prepares server detail
snapshots. These are editable site declarations.

## Use SQL

From the workspace root, build the libraries with `pnpm build:packages`.
From this app directory, run `pnpm data:setup` and open `/projects`.
The explicit setup creates an empty SQLite database and media directory.
Generate with `--setup-with-demo` to have both data sources ready with eight
projects. With delivered demo inputs, `pnpm data:setup --with-demo` explicitly
imports the file catalog and pages into local SQL and copies their public media.
The demo's source JSON and translations are shared by both forms. Existing
rows and media are preserved on repeated import.

The generated app's `src/integrations/portfolio/` owns local/Cloudflare
connections. `src/features/projects/sql/` owns query composition, HTTP handling
and browser requests. Its `src/features/projects/sql/browser/` directory owns
the SQL-specific request state. Shared presentation lives in
`src/features/projects/components/`.

See the app README for remote D1/R2 configuration and publication media
permissions. SQL is useful when content publishing should be independent of
the application's deployment. File-based content trades that workflow for
an index shipped with the application. Consider index size and update needs
as the catalog grows.

File details can be prerendered for their known slugs and locales. The file
list reads URL query parameters on the server to preserve filtered SSR.
Keeping both examples also keeps the SQL routes and their deployment needs.

## Keep SQL and remove the file example

1. Remove the example route directory
   `src/app/[locale]/examples/content-projects/` and
   `test/e2e/content-projects.spec.ts`. Remove its link and related imports
   from `src/app/[locale]/projects/page.tsx` by finding `fileProjects.example`.
2. To keep `data:setup --with-demo` or an authored file-to-SQL import workflow,
   keep the file readers, registrations, prepared inputs and Text namespace.
   `features/projects/import.node.ts` composes them for the import command.
   The file list/detail routes and their client components can be removed
   independently.
3. To remove file data entirely, first remove the dataset import branch and its
   imports from `scripts/data-setup.ts`. Keep its migration and pin/unpin
   commands. Then remove `features/projects/dataset.node.ts`, `import.node.ts`,
   `dataset-types.ts`, and the SQL import modules. Remove the file-feature
   imports/spreads from `src/site/content-schemas.ts`,
   `src/site/resource-scopes.ts`, and `content-resources.config.ts`, leaving
   the base Content registration. Finally remove `features/projects/files/`,
   its prepared inputs, and the optional demo Text namespace. Prepare and build.

Keep the common components and any media used by SQL. Existing private
overrides can be archived separately.

## Keep project files and remove SQL

1. Point the site's Projects navigation at `PROJECT_FILES_PATH` in
   `src/site/routes.ts`, importing it from `../features/projects/files/index.ts`
   (the declarations are also read by Node during preparation).
   In `src/app/[locale]/_components/home-page.tsx`, replace the ProjectBrowser
   import with ContentProjects from `../../../features/projects/files/client`
   and render `<ContentProjects pathname={SITE_ROUTES.home} titleAs="h3" />`
   inside the existing HomeProjects section. Remove HomeContent's unused
   `locale` prop and TextLocale import, and its argument in
   `src/app/[locale]/page.tsx`. The home page can then return `<HomeContent />`
   synchronously; keep its localized metadata function.
   On the file list page, change the back-link's `SITE_ROUTES.projects`
   destination to `SITE_ROUTES.home`.
2. Delete these SQL-owned groups, relative to the app directory.

   ```sh
   rm -rf 'src/app/[locale]/projects' src/app/api/projects src/integrations/portfolio
   rm -rf src/features/projects/sql
   rm -f src/features/projects/import.node.ts src/features/projects/dataset.node.ts src/features/projects/dataset-types.ts
   rm -f scripts/data-setup.ts test/e2e/portfolio.spec.ts
   ```

   The project import entry and dataset preparation modules belong to the SQL
   import workflow. Remove them with SQL, even though they sit beside the file
   feature; the retained file routes load their prepared resources independently.

3. Remove `data:setup`, `data:pin` and `data:unpin` from the app manifest,
   its direct `@frontend/node-storage` dependency, and the explicit
   `scripts/data-setup.ts` tsconfig include. From the workspace root run
   `pnpm install`, prepare this app and build it.

For browser acceptance, keep the file cases in `test/e2e/content-projects.spec.ts`
and remove `/projects` from its shared pagination loop. If keeping the clean
starter test in `test/e2e/empty-projects.spec.ts`, remove its SQL API assertions
and retain only the file route in its route loop.

The remaining browser fixture skips database setup when the setup script is absent.
The common project components, URL state and `src/styles/projects/` serve both
sources, so keep them.

The generated package scope may differ from `@frontend`. Remove the matching
Node storage dependency for your scope. Contact can still use the Cloudflare
email adapter, so inspect that consumer before removing its dependency.
The reusable Portfolio package continues to provide the common contracts and
renderer. Remove unused adapter workspaces only when no other app needs them.

The file routes retain their example URLs. To rename them, update the
`PROJECT_FILES_PATH` constant along with the Next route directories and
their relative imports.

## Generation and ownership

Default clone delivers a valid empty file index and no registered project pages.
`--setup` also initializes an empty local database. `--setup-with-demo` delivers
the optional project inputs, translated Text namespace and public media and
imports them into the final app's local database. It includes setup; choose one
flag. All modes can independently prepare resources and build.

Selected demo files become ordinary tracked app inputs under
`content/default/` and `public/`. Their origin directory `template/demo/` and
source-only test fixtures stay in the template repository. A later Git clone of
the generated project retains its authored content and can explicitly recreate
local storage. `.local/` remains private and disposable.

The main AppConfig defaults to six projects per page for both sources. Optional
demo content contains eight projects, so the default view has pages of six and
two. Edit these app-owned inputs freely after generation.
