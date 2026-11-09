# Architecture

## Source repository and generated workspaces

This repository maintains neutral framework capabilities, reusable site/adapters,
application templates and generation tools. There are no consuming apps here.
The two Next.js starters are live source workspaces with their own identities and
ports; node-library is an inactive scaffold. Templates are not runtime dependencies.

The generator creates an external monorepo with all neutral shared capabilities.
Bare mode has no app, site or adapter implementation. Default mode adds one plain-next
app named web; template:clone later injects one app with its necessary optional
package closure. Each task has its own independently installable commit. Hooks
contribute root requirements while the generator owns conflict checks, installation,
qualification and Git publication. Source templates/maintenance tools, private data
and source Git history are excluded. See [generation](generation.md).

## Dependency layers

- `packages/shared` owns neutral contracts, components, styles and mechanisms.
- `packages/site` owns domain contracts, presentation, queries and styles using
  neutral interfaces. It never opens concrete provider connections.
- `packages/adapters` implements concrete service/runtime ports. It never imports
  application, site or template code.
- `packages/templates` owns starting points and their initialization metadata.
- Generated apps are composition roots: they choose providers, supply actual
  content, configure runtime environments and inject ports.

Templates may declare shared and site dependencies. Shared packages cannot depend
on site packages. Shared, site and template packages cannot depend on adapters
or their provider SDKs. These rules apply to tests and every manifest group.
Templates remain development inputs for the generator. The policy checker derives
provider SDK ownership from adapter metadata and checks direct and transitive
adapter dependencies, public package imports and environment boundaries.

## Layout and styling

React components own structure, accessibility, semantics and interaction. Stable
`ui-*` classes and bounded variants expose their styling contract. Consumers
explicitly select styles; reusable components do not import global CSS.

`@frontend/ui/default.css` provides foundational layout tokens and component
geometry, including Row, Column, and responsive behavior. Feature packages export
their own default structure. Hosts can override the published tokens and hooks
from their own CSS.
`styles` owns neutral visual tokens, light/dark/system themes and component
appearance. The shared cascade order is `ui-layout-tokens`, `ui-theme-tokens`,
`ui-base`, `ui-layout`, `ui-components`, `ui-example`.

`@frontend/ui/web-shell` supplies the frame, navigation and footer. The
interactive header is available at `@frontend/ui/web-shell/header`. The host can
import `@frontend/ui/web-shell.css` for structure and
`@frontend/styles/web-shell.css` for optional appearance. Theme preferences and runtime policy belong to
the host. Demo composition is opt-in through the separate example stylesheet.

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
See [resource initialization](../common/resource-initialization.md),
[resource model](../common/resource-model.md) and [Providers](providers.md).

## Content and editing

`ui-document` owns document protocols, validation, bindings and variable resolution.
`puck-adapter` owns schema-backed editor and server rendering integration.
`content-blocks` supplies neutral blocks and media behavior. The Studio site
package builds on those capabilities. Its `/data` entry provides portable
editing files and publication contracts. Its UI entries provide editing
sessions and workspaces. The host supplies the transport or provider.

The Studio template demonstrates in-memory records, upload adapters, project
files, editing and isolated RSC preview on the prepared resource foundation.
Its demo state and preview process are not a production persistence service.
Consumers supply authenticated storage/publication capabilities explicitly.

## Optional storage and services

`storage` owns neutral SQL/object ports, key/size rules and connection lifecycle
caching. Applications and their domain packages consume those ports for queries,
mappings, migrations, publication and media rules.

The Node adapter implements SQLite/files. The Cloudflare adapter implements
D1/R2 and optional email/verification ports, with separate native and Node
Wrangler development entries. Neither chooses a host's resources, credentials
or dataset.
See [data source ownership](data-sources.md) and each adapter README.

## Verification and ownership

Root tooling owns package discovery, build order, formatting/lint/types and policy.
Library behavior tests live with their packages; templates own their Next/browser
acceptance. Source validation does not require an existing app. Independent clone
acceptance verifies installation, default/custom preparation, production builds,
SSR/CSR/language behavior and frozen reinstalls using the public generator.

Source generation/verification tools stay in this repository. Generated projects
retain the applicable workspace runners, standards, tests and documentation and
can be maintained without the source repository or external engineering records.
