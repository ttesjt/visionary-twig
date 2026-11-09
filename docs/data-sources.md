# Data source ownership

Framework packages accept storage capabilities through neutral contracts. The
source template repository has no configured business database, media bucket,
application import command or deployment target.

- `@frontend/storage` owns SQL/object ports, validation and the connection lifecycle
  cache. Its `/content` entry implements the registry-injected ContentStore using
  SQLite-compatible SQL; it does not select a database provider.
  media authorization against injected ports.
- `@frontend/node-storage` implements Node SQLite/files.
- `@frontend/cloudflare` implements D1/R2, email and verification ports. Its Node
  development bridge remains distinct from native runtime bindings.

Consumers own configuration, connection creation, authentication, HTTP routing and
any explicit business import/publication workflow. Neither templates nor shared or
site packages create Cloudflare connections. Tests for neutral business rules inject
ports; adapter tests stay with their concrete implementation.

See the [storage](../packages/shared/storage/README.md),
[Node adapter](../packages/adapters/node-storage/README.md) and
[Cloudflare adapter](../packages/adapters/cloudflare/README.md) contracts.

Prepared Text, AppConfig and Content inputs are independent of SQL/media selection.
Installing, preparing or building resources does not create cloud resources,
migrate a database or upload user data.
