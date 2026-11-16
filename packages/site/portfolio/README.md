# Portfolio

Reusable portfolio project data and presentation for sites. The site owns routes,
locale selection, real project records, and the storage connections it injects.

## Read projects

Import business schemas from `@frontend/portfolio/contracts` and migrations and
queries from `@frontend/portfolio/server`. These entries work without React or
Puck at runtime. The host supplies a `SqlDatabase` and, for detail composition, a
storage read scope and the content registry used by its renderer.

Run `migratePortfolio(database)` explicitly before seeding or serving requests.
The migrations target SQLite/D1 and require foreign keys and atomic SQL batches.
Projects and categories contain stable IDs and an explicit default locale.
Translations, category membership, and published details are separate tables.
Publishable media is referenced by object key. Store bytes in the injected
object storage.

- `listProjects` queries published summaries ordered by sort order and ID. Pass
  a locale, optional category ID, and optional limit and offset. It returns
  `hasMore` and leaves detail documents out of the list.
- `listProjectCategories` returns localized categories and counts computed from
  published projects.
- `readProjectDetail` returns `not-found`, `summary-only`, `invalid-document`, or `ready`. It can
  fall back to the default language when the requested language has no published
  document. The summary and document use the same language.
- `readProjectMedia` checks that the published project references the requested
  object before reading the bytes. It returns null if either lookup has no result.

When publishing a replacement, update the page before inserting its complete
set of media references in the same SQL batch. Changes to the page revision,
document or context automatically remove its previous references. Deleting the
page removes its references as well. Cover and badge references grant their own
access. Physical object deletion belongs to the host.

The database stores one published UI document and context per project and locale.
A ready detail preserves the authored document, its bindings and the stored
context so the renderer can resolve them. An invalid published document keeps
the readable summary and provides a `PortfolioDataError` for server diagnostics.
Storage failures and corrupt summary rows still surface to the host.

## Present projects

`@frontend/portfolio/identity` exposes the ID, slug, locale and media-key
schemas independently of catalog queries. Hosts can use them when validating
file-based project inputs.

`@frontend/portfolio/ui` exports `ProjectCard`, `ProjectGrid` and the controlled
`ProjectCategoryFilter`. The host supplies links and cover URLs, translated UI
labels, and the filter selection callback. Cover data provides a storage key and
localized alternative text. The grid shows the supplied empty message when there
are no projects. Import `@frontend/portfolio/default.css` for optional default card,
grid and filter styles powered by the shared theme tokens.

Use `projectPageRegistry` from `@frontend/portfolio/render` for reads that will
use the included `ProjectPageContent`. It selects the same document registry as
the shared Puck renderer. On a `ready` result, pass the returned page to
`ProjectPageContent`. Its rendering supports stored variables and bindings as
well as the publication context. The host can render metadata on its own for a
`summary-only` result and handle `not-found` with its route's response.
