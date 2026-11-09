# Application workspace architecture

This independent monorepo contains user-owned applications, neutral shared
capabilities and optional domain/service extensions. It does not depend on a source
template checkout, its Git history or external engineering records.

- apps owns deployable hosts, routes, content, environment choices and composition.
- packages/shared owns neutral contracts, components, styles and mechanisms.
- packages/site owns optional domain models/queries/presentation using shared ports.
- packages/adapters owns optional concrete runtime/provider implementations.
- Root scripts/tooling owns discovery, installation policy, builds and checks.

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
