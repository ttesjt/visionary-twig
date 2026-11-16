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
