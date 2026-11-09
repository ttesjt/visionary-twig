# Storage ports

Provider-neutral SQL and bounded object storage contracts. The default entry exports SqlDatabase, commands/results/values, ObjectStorage, StoredObject, key/size validation and an injected connection lifecycle cache. It reads no environment and chooses no provider.

Object reads and writes support up to 25 MiB.

createStorageLoader takes a configuration reader returning configuration or null and an injected connector. It shares pending initialization, retries failures and releases superseded connections. The caller owns final process disposal. Providers implement StorageConnection; applications own provider selection, authentication and publication policy. No SDK, resource identity, Wrangler or site package is imported here.
