# Portfolio template

A localized Portfolio foundation with Home and About, prepared site resources,
and neutral project file contracts. Source preview inputs are fictional and
live under `template/demo/`; ordinary generated apps use their own empty index.

Run `pnpm app:prepare --app template-portfolio --source default` from the source
workspace, then `pnpm dev --app template-portfolio`.

Generate an independent app with
`pnpm repo:clone --output ../portfolio-project --template portfolio --app-name portfolio`.
See the [delivered README](template/README.md) for app-owned customization.

## Project storage setup

The source workspace previews the prepared fictional project inputs without a
concrete provider. Generated apps inject SQLite/files or Cloudflare D1/R2.

Generation supports `--setup` for empty local storage and `--setup-with-demo`
for the eight-project file inputs, translated dictionaries and local SQL import.
Both flags are explicit and mutually exclusive. Existing target files are not
replaced. The selected data command runs in the final generated app as well as
in its disposable validation candidate.

From a generated app directory, run `pnpm data:setup` for empty local storage,
`pnpm data:setup --with-demo` to import delivered demo inputs, or
`pnpm data:pin field-notes` / `pnpm data:unpin field-notes` to update a pin.
The import preserves existing authored rows and objects. Configure
`PORTFOLIO_DATA_SOURCE` and `PORTFOLIO_WRANGLER_CONFIG` for Cloudflare; use
`pnpm data:setup --cloudflare` only when intentionally applying remote migrations.

Prepared JSON remains app-owned under `content/default`; `.local` storage is
private. The data command does not copy source-repository databases into apps.

## Browse SQL projects

`/projects` uses the injected data port and read-only BFF. Category and page are
stored in the URL; repeated selection preserves the current page, changing the
category resets it, and browser history restores both values. Page capacity uses
`projects.pageSize` in AppConfig. Categories and results recover independently.

List responses carry the source identity that produced them. A newer SSR seed
supersedes an earlier browser attempt. Pending regions display Skeletons;
transport, validation and source errors retain their identity and offer retry.

`/projects/[slug]` renders the stored Puck document and context with sharing
metadata, inline chapter anchors, and explicit unpublished/invalid-detail states.
Media is served only when referenced by a current published record, cover or badge.

## Contact

The Contact page uses the reusable form and shared server validation. The host
injects an EmailSender; local delivery writes to the configured disposable
outbox, while a generated host can opt into the Cloudflare sender. Configure
`PORTFOLIO_CONTACT_FROM`, `PORTFOLIO_CONTACT_TO`, and the allowed origin before
production use. Platform links are configured by `contact.links` in AppConfig.
The handler bounds request size, validates fields and reports typed delivery errors.

## Appearance and header

Static Mono CSS and the optional Neutral/Mono preview are independent of
light/dark/system. Header layout supports full-width and floating (default full
width), an image brand, visible navigation configuration and a localized keyboard
skip link. The preview lives entirely in src/demo/appearance; no application
resource or component mounting depends on it.

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
