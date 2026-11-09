# Node storage adapter

Implements neutral storage ports with node:sqlite and bounded filesystem objects. Callers supply explicit absolute paths. Opening requires an existing database; it never creates/migrates/seeds collections. Hosts may inject a native database compatibility check without the adapter knowing domain rules.

openNodeStorage returns database, object ports, a transaction-scoped read callback and close. Every scoped read owns a separate read-only SQLite connection; writes use atomic batches. createSqliteDatabase adapts a caller-owned native connection without owning its lifecycle. createSqliteReadScope supports legacy bounded file reads. File storage validates keys, size and real-path containment. No cloud SDK, app or site domain is imported.
