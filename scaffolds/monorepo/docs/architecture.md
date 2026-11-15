# Application workspace architecture

This independent monorepo contains user-owned applications, neutral shared
capabilities and optional domain/service extensions. It does not depend on a source
template checkout, its Git history or external engineering records.

You own the source in all three package directories. Workspace dependencies let
you change a package and update its consumers together, without publishing a
new package version first.

- `apps` holds deployable hosts, routes, content, environment choices and composition.
- `packages/site` is the shared area for this site's domain models, queries,
  components and styles. It can hold new site-specific packages and changes to
  existing packages.
- `packages/shared` holds neutral contracts, components, styles and mechanisms.
- `packages/adapters` holds concrete runtime and provider implementations.
- Root scripts and tooling handle discovery, installation policy, builds and checks.

Shared does not depend on site/apps/adapters. Site does not depend on concrete
adapters. Adapters do not depend on app/site internals. Apps create integrations
and inject ports. All dependency groups and transitive provider chains participate
in policy checks; a dev dependency does not bypass ownership.

Libraries expose built public entries and build before consumers. Root development
runners build/watch selected dependency closures; clean installs do not rely on
old dist. React packages export their own default CSS, and the styles workspace
provides optional appearance. Apps explicitly select their style entries.
See [package conventions](package-conventions.md) and [repository conventions](repository-conventions.md).

Prepared Text, AppConfig and Content keep defaults tracked and .local/.generated
ignored. Runtime consumes validated generated artifacts through scoped readers.
The Runtime shares transport/cache; Providers own scopes; resource gates load
missing requirements and block only their dependent visual subtree. Server
Layout/Page snapshots pass down before consumers render. See
[resource model](resource-model.md), [initialization](resource-initialization.md)
and [Providers](providers.md).

Studio document/session contracts, editor rendering and neutral persistence ports
remain separate. A starter's in-memory adapters are examples, not authenticated
production storage. Choose integrations deliberately; ordinary install/prepare/build
never deploys, migrates cloud data or grants editing access.

## Compatibility when importing templates

When adding an app, the generator reuses existing workspace packages whose
delivery identity and public manifest contracts match. The new app then uses
your local implementation of each reused package.

Keep changes to `packages/shared` and `packages/adapters` deliberate. Future
templates may rely on the same exports, behavior, or configuration. A manifest
incompatibility can stop an import. A behavior change can pass the manifest check
and still break a newly imported app at build time or runtime.

Before changing either layer, check which current apps and packages depend on
it and whether future imports may need adaptation. Keep existing public contracts
where practical. If you choose a breaking change, document what later templates
will need to adapt and verify the affected consumers.
