# Cloudflare adapter

D1 and R2 implement the neutral @frontend/storage ports. This package owns only provider adaptation and lifecycle, with no domain queries, document store, resource identity or environment selection.

The default entry exports createD1Database, createR2Storage and createCloudflareStorage for native bindings supplied by a Worker host. It imports no Node development bridge. The /local entry explicitly opens Wrangler getPlatformProxy and returns a StorageConnection; the caller supplies an absolute config path and remoteBindings flag, and owns close/dispose. It is for local Node servers, never production Workers/browser graphs.

SQL document storage lives in @frontend/storage/content and consumes the existing content-data protocol. Consumers choose providers and inject ports into domain services or ContentStore. Pure adapter tests stay with this package.
