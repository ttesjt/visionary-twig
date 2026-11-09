# Architecture

## Source repository and generated workspaces

This repository maintains neutral framework capabilities, reusable site/adapters,
application templates and generation tools. There are no consuming apps here.
The two Next.js starters are live source workspaces with their own identities and
ports; node-library is an inactive scaffold. Templates are not runtime dependencies.

The current generator creates a new independent monorepo from selected templates
and their shared dependency closure. It maps names/paths, runs template hooks,
merges root contributions, installs once, prepares inputs and validates. Template
sources, generation tools, source Git history and private/generated data are not
delivered. Optional site/adapter selection and adding to an existing external
monorepo remain future generation capabilities. See [template usage](using-template.md).

## Dependency layers

- `packages/shared` owns neutral contracts, components, styles and mechanisms.
- `packages/site` owns domain contracts, presentation, queries and styles using
  neutral interfaces. It never opens concrete provider connections.
- `packages/adapters` implements concrete service/runtime ports. It never imports
  application, site or template code.
- `packages/templates` owns starting points and their initialization metadata.
- Generated apps are composition roots: they choose providers, supply actual
  content, configure runtime environments and inject ports.

Shared and template packages cannot depend on site/adapters; site cannot depend
on adapters. These rules cover direct/transitive dependencies, tests and every
manifest group. Templates remain development inputs rather than dependencies of
other workspaces. The policy checker derives provider SDK ownership from adapter
metadata and checks public package imports and environment boundaries.

## Layout and styling

React components own structure, accessibility, semantics and interaction. Stable
`ui-*` classes and bounded variants expose their styling contract. Consumers
explicitly select styles; reusable components do not import global CSS.

`ui` owns structural tokens, Row/Column, layout and responsive behavior.
`styles` owns neutral visual tokens, light/dark/system themes and component
appearance. The shared cascade order is `ui-layout-tokens`, `ui-theme-tokens`,
`ui-base`, `ui-layout`, `ui-components`, `ui-example`.

Consumer theme preferences and runtime policy stay outside reusable CSS. Demo composition is opt-in through the separate example stylesheet.

## Resources and lifecycle

`prepared-data` owns merge, safe paths, transactions, rollback and freshness.
`text-catalog`, `app-config` and the prepared JSON resource contracts own their
specific validation/readers. Each host declares neutral default inputs, optional
ignored custom inputs and fixed ignored generated artifacts. Installing or
building never silently selects a private profile or reparses default sources.

Namespace starters use a shared resource Runtime, scoped Providers and
`ResourceScope` to prepare plans and publish readers. Server Layout/Page snapshots
are passed down before dependent content renders. CSR Guardians block only the
relevant visual subtree. Appending a namespace uses the nearest Provider; an
additional Provider is optional for independent scope/lifetime or a page SSR
snapshot. Locale switching prepares active scopes before publishing consistently.
See [resource initialization](resource-initialization.md),
[resource model](resource-model.md) and [Providers](providers.md).

## Content and editing

`ui-document` owns document protocols, validation, bindings and variable resolution.
`puck-adapter` owns schema-backed editor and server rendering integration.
`content-blocks` supplies neutral blocks and media behavior. `studio/data` owns
portable project/file/publication contracts; `studio` supplies sessions and
editor/workspace components without choosing a transport or provider.

The Studio template demonstrates in-memory records, upload adapters, project
files, editing and isolated RSC preview on the prepared resource foundation.
Its demo state and preview process are not a production persistence service.
Consumers supply authenticated storage/publication capabilities explicitly.

## Optional storage and services

`storage` owns neutral SQL/object ports, key/size rules and connection lifecycle
caching. Its `/content` entry implements a registry-injected ContentStore using
those ports for domain queries, mappings, migrations, publication and media rules.

The Node adapter implements SQLite/files. The Cloudflare adapter implements
D1/R2 and optional email/verification ports, with separate native and Node
Wrangler development entries. Neither chooses a host's resources, credentials
or dataset.
See [data source ownership](data-sources.md) and each adapter README.

subscriptions and controlled UI. Hosts inject transport, labels and policy.
Shared capabilities never implicitly instantiate a cloud service.

## Verification and ownership

Root tooling owns package discovery, build order, formatting/lint/types and policy.
Library behavior tests live with their packages; templates own their Next/browser
acceptance. Source validation does not require an existing app. Independent clone
acceptance verifies installation, default/custom preparation, production builds,
SSR/CSR/language behavior and frozen reinstalls using the public generator.

Source generation/verification tools stay in this repository. Generated projects
retain the applicable workspace runners, standards, tests and documentation and
can be maintained without the source repository or external engineering records.
