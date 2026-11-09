import type { StorageConnection } from './contracts.js';
/** The host selects/configures a provider; this cache only owns connection lifecycle. */
export function createStorageLoader<Configuration>(
  readConfiguration: () => Configuration | null,
  connect: (configuration: Configuration) => Promise<StorageConnection>
): () => Promise<StorageConnection | null> {
  let configurationKey: string | undefined;
  let pending: Promise<StorageConnection> | undefined;
  function releasePrevious() {
    if (pending) void pending.then((connection) => connection.close()).catch(() => {});
    pending = undefined;
    configurationKey = undefined;
  }
  return () => {
    const configuration = readConfiguration();
    if (configuration === null) {
      releasePrevious();
      return Promise.resolve(null);
    }
    const key = JSON.stringify(configuration);
    if (!pending || key !== configurationKey) {
      releasePrevious();
      configurationKey = key;
      const request = Promise.resolve().then(() => connect(configuration));
      pending = request;
      void request.catch(() => {
        if (pending === request) pending = undefined;
      });
    }
    return pending;
  };
}
