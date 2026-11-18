# Portfolio

Edit Home and About under `src/app/[locale]`. Site declarations live in
`src/site`; resource and theme mechanisms live in `src/infra`.

Run `pnpm app:prepare --app {{appId}}` from the workspace root after changing
`content/default` or `config/default`. Private overrides use `.local/content`
and `.local/config`. Generated artifacts are not authoring inputs.

`features/projects/files` defines the prepared project index and document
contracts. The default project index is empty. Components read resources through
the inherited Providers after ResourceScope prepares the declared requirements.

Start with `pnpm dev --app {{appId}}` and build with
`pnpm build --app {{appId}}` from the workspace root.

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
