# Portfolio

Use `src/app/[locale]` to edit Home, About, Projects and Contact. The navigation,
locale routing, theme and resource providers live in the layout. Edit default
English and Chinese labels under `content/default/text`, and optional
site-specific overrides under `.local/content/text`. Edit the site's display name
and About summary in `content/default/data/base.json` or `.local/content/data/base.json`.
The default summary references the locale's Text catalog. Site configuration uses
the same default/custom preparation flow. Run these commands from the
generated workspace root:

```sh
pnpm app:prepare --app {{appId}}
pnpm dev --app {{appId}}
pnpm build --app {{appId}}
```

See [pages and feature modules](docs/feature-modules.md) for the directory map,
adding/removing pages and bringing a capability from another template.

The supported locale and resource scopes are declared under `src/site`, and the
shared resource and theme wiring lives under `src/infra`.

## Appearance

The site imports Mono styles by default. An optional demo in `src/demo/appearance`
adds an Appearance preview menu for Mono and Neutral. The header's Theme menu selects Light,
Dark or System separately.
The demo preview stores its own choice; the real theme preference is independent.

Mono uses the shared stylesheet at `@frontend/styles/themes/mono.css`. The
Portfolio layout is defined in `src/styles/mono.css`. The home page shows
selected work from the projects APIs, so the same projects and categories appear
on the home page and on Projects. To add an optional image below the home
introduction, set `home.image` in AppConfig and update `home.imageAlt` in each
language's Text catalog.

Edit `src/styles/index.ts` to select static style entries. No runtime preset is required.

## Header

Set `header` in `config/default/app.json` or `.local/config/app.json` and rerun
resource preparation. Use `"layout": "floating"` for an inset sticky header in
either preset. The default is `"full-width"`.

`brandImage` is a browser-loadable image path or HTTP(S) URL. Replace the
included P mark at `public/brand/portfolio.svg` or point to another image
file. Omit `brandImage` for a text-only home link. The browser tab icon lives
separately at `src/app/icon.svg`.

List any of `home`, `about`, `projects`, and `contact` in `hiddenNavigation`
to hide those header links. Their routes remain available. The brand always
links to Home.

## Project data

The starter includes SQL-backed Projects and a separate
`/examples/content-projects` page backed by project JSON. Both use the same
cards, filters, pagination controls, localized readers and Puck renderer.
See [choose a project data source](docs/project-data.md) for setup and removal.
The ordinary clone starts with an empty file index. Generate with `--setup`
to initialize empty local SQL storage, or `--setup-with-demo` to prepare both
sources with the same eight fictional projects and their media. Both clone
commands support these flags. The demo option completes setup in the final
generated app before reporting success.

An independent install can build without a database. Initialize local project data
before browsing projects in the running app:

```sh
pnpm build:packages
cd apps/{{appId}}
pnpm data:setup
```

This initializes empty SQLite storage under the ignored `.local/portfolio`
directory. If demo inputs were selected during generation, run
`pnpm data:setup --with-demo` to reimport them explicitly. Rerunning import
preserves existing rows and media. `--local` pins setup to the app's default
local directory; without it, manual setup respects `PORTFOLIO_LOCAL_DIR`.
Projects initially renders from SQL for the requested category and page. Share a
link such as `/projects?category=web` or `/projects?page=2` to keep that view.
Changing the category starts on page one. In the browser, navigation loads
results from `/api/projects` and keeps the selected view in browser history.
The same URL parameters apply to Selected work on the Mono home page.
Set `projects.pageSize` in the main AppConfig to an integer from 1 to 100.
The default capacity is 6. The server, browser and file example read this setting.
The optional eight-project dataset demonstrates a second page with two entries.
Categories and project results load independently. Each can be retried without
refetching the other. Browser navigation uses SWR's in-memory cache. A full
reload requests current data.
Each new SSR snapshot supersedes earlier cached responses and failures for
that query. Retries started for the current snapshot can update its result.
Details read published documents and render the shared Puck
blocks. Media URLs pass through the app's authorized project media route.
Each detail generates sharing metadata from its summary and available cover.
Set `SITE_URL` to your public origin for absolute canonical and cover URLs.
Details keep the project summary visible while a write-up is unpublished or
its stored document cannot be rendered.

When importing a Puck publication, update its document and context first,
then register its current object keys in `portfolio_project_page_media` in
the same SQL batch. Replacing or deleting a publication clears its old media
references. Objects used as active project covers or badges remain available.
The optional Field Notes sample uses Puck's inline `ContentNavigation` and `Anchor`
blocks. Its chapter links work as ordinary URL fragments, for example
`/projects/field-notes#field-study`.

To use remote D1 and R2 from a local Node server, set
`PORTFOLIO_DATA_SOURCE=cloudflare` and `PORTFOLIO_WRANGLER_CONFIG` in the app's
`.env.local`. Configure remote bindings named `DB` and `MEDIA` in that Wrangler
file. Set up the destination schema explicitly from the app directory with
`pnpm data:setup --cloudflare`. This command applies migrations to the selected
D1 database. Demo import is an explicit local operation.

A Worker host can compose the same queries with its request's bindings using
`createWorkerPortfolioData` in `src/integrations/portfolio/worker.ts`. Use that
entry as the app's composition point when adapting the starter to a Worker
host and supply a stable source ID for the selected bindings. Change that ID
when switching to a different database or bucket.

The Node host captures its source configuration on first use. Restart the
server after editing local paths or the Wrangler file. The Wrangler bridge
needs write access beside the config to open a temporary copy with identical
contents and relative paths. Collection responses identify the selected source
with `X-Portfolio-Source`. Requests carrying a different source ID get
`409 source-changed`. Other public errors distinguish invalid input,
source unavailability and invalid stored data.

From the app directory, use `pnpm data:pin field-notes` to move that project
ahead of ordinary projects and `pnpm data:unpin field-notes` to restore its
usual order. Append `--cloudflare` to target the configured D1 database. Run
the corresponding `data:setup` first to apply schema migrations. Pinning
preserves the project’s publish status and category memberships.

An optional badge is independent of pinning. In SQL, add a `text` or `image`
row to `portfolio_project_badges`, then add localized labels to
`portfolio_project_badge_translations`. For an image badge, the label is its
alt text and the object's key must point to an image in the configured media
storage. Badges use the requested language, then the project's default
language. A badge is hidden until a label is available in one of those languages.

Existing projects can keep a single `cover_key`. To send a smaller image to
the project grid, add `display` and `thumbnail` rows to
`portfolio_project_cover_sources` with the active `cover_key`, each object's
key and its actual pixel dimensions. The display row uses the cover key
itself. The grid uses the browser's responsive image selection when both
sizes are available and falls back to the display file otherwise.
Registering an `original` makes it publicly accessible through the project's
media route. Register the original only when it is meant to be public.

## Contact

Set platform links in `config/default/app.json` or your ignored custom
configuration. Each entry contains a display name, URL and optional icon asset.

On localhost the form accepts submissions into `.local/portfolio/outbox`. The
outbox contains the actual message, so keep it private. To enable Cloudflare email
delivery, select `PORTFOLIO_CONTACT_DELIVERY=cloudflare` and set the contact origin,
sender and recipient, and Cloudflare account/token in server environment variables.
See `.env.example` for the names. Choose `disabled` to suspend submissions.
The address a visitor supplies becomes Reply-To, while the actual sender and
recipient come from server configuration. The endpoint applies a per-process
request cap. Configure additional rate limiting at the host for multi-instance
deployments.

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
