# Data source ownership

Prepared Text/AppConfig/Content are public read-only resources, not a replacement
for application databases, editor drafts or private storage. UI resources use
tracked defaults and ignored per-app .local overrides, prepared explicitly into
.generated artifacts. Runtime consumes the prepared result; it never selects a
personal/default source directory on each request.

Applications choose SQL/document/object storage implementations and inject their
interfaces into business modules. Neutral contracts live in shared packages such
as [storage](../packages/shared/storage/README.md) and
[ui-document](../packages/shared/ui-document/README.md). Optional site packages
own business validation, queries and publication policy. Optional adapters implement
runtime/service ports without owning a particular app's resources or credentials.

Install/prepare/build do not connect to a personal database, migrate content,
upload media or deploy anything implicitly. Configure any remote integration and
its authentication, permissions, media handling and explicit migration separately.
Do not place server secrets in resources handed to client Providers.
