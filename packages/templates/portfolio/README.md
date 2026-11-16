# Portfolio template

A localized Portfolio foundation with Home and About, prepared site resources,
and neutral project file contracts. Source preview inputs are fictional and
live under `template/demo/`; ordinary generated apps use their own empty index.

Run `pnpm app:prepare --app template-portfolio --source default` from the source
workspace, then `pnpm dev --app template-portfolio`.

Generate an independent app with
`pnpm repo:clone --output ../portfolio-project --template portfolio --app-name portfolio`.
See the [delivered README](template/README.md) for app-owned customization.
