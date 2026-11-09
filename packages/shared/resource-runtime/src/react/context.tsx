import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { SWRConfig, useSWRConfig, type SWRConfiguration } from 'swr';
import { createResourceFetcher } from '../core/load.js';
import type { ResourceReader } from '../core/contracts.js';
import { ResourceCache } from './cache.js';
/** Borrow an existing SWR cache; provider factories belong only to their owner. */
function reuseSWRCache(configuration: ReturnType<typeof useSWRConfig>) {
  const value: ReturnType<typeof useSWRConfig> & Pick<SWRConfiguration, 'provider'> = {
    ...configuration,
  };
  delete value.provider;
  return value;
}
interface Runtime {
  readonly cache: ResourceCache;
  readonly fetchResource: ReturnType<typeof createResourceFetcher>;
  readonly swr: ReturnType<typeof useSWRConfig>;
}
const Context = createContext<Runtime | undefined>(undefined);
export function ResourceRuntimeProvider({
  reader,
  children,
  inactiveCacheEntries,
  timeoutMs,
  concurrency,
  maxPendingResources,
}: {
  readonly reader: ResourceReader;
  readonly children: ReactNode;
  readonly inactiveCacheEntries?: number;
  readonly timeoutMs?: number;
  readonly concurrency?: number;
  readonly maxPendingResources?: number;
}) {
  const inherited = useSWRConfig();
  const [cache] = useState(() => new ResourceCache(inactiveCacheEntries));
  const fetchResource = useMemo(
    () =>
      createResourceFetcher(reader, {
        ...(timeoutMs === undefined ? {} : { timeoutMs }),
        ...(concurrency === undefined ? {} : { concurrency }),
        ...(maxPendingResources === undefined ? {} : { maxPendingResources }),
      }),
    [reader, timeoutMs, concurrency, maxPendingResources]
  );
  const owners = useRef(new Map<typeof fetchResource, number>());
  useEffect(() => {
    const lifetimes = owners.current;
    lifetimes.set(fetchResource, (lifetimes.get(fetchResource) ?? 0) + 1);
    return () => {
      lifetimes.set(fetchResource, (lifetimes.get(fetchResource) ?? 1) - 1);
      queueMicrotask(() => {
        if (lifetimes.get(fetchResource) === 0) {
          fetchResource.dispose();
          lifetimes.delete(fetchResource);
        }
      });
    };
  }, [fetchResource]);
  const configuration = useMemo(() => ({ provider: () => cache }), [cache]);
  return (
    <SWRConfig value={configuration}>
      <RuntimeScope cache={cache} fetchResource={fetchResource} inherited={inherited}>
        {children}
      </RuntimeScope>
    </SWRConfig>
  );
}
/** Keep one resource SWR owner alive, while descendants retain their ambient SWR scope. */
function RuntimeScope({
  cache,
  fetchResource,
  inherited,
  children,
}: {
  readonly cache: ResourceCache;
  readonly fetchResource: Runtime['fetchResource'];
  readonly inherited: ReturnType<typeof useSWRConfig>;
  readonly children: ReactNode;
}) {
  const current = useSWRConfig();
  const swr = useMemo(() => reuseSWRCache(current), [current]);
  const ambient = useMemo(() => reuseSWRCache(inherited), [inherited]);
  const runtime = useMemo(() => ({ cache, fetchResource, swr }), [cache, fetchResource, swr]);
  return (
    <Context.Provider value={runtime}>
      <SWRConfig value={() => ambient}>{children}</SWRConfig>
    </Context.Provider>
  );
}
/** Only resource request components enter the runtime's private SWR scope. */
export function ResourceRequestScope({ children }: { readonly children: ReactNode }) {
  const { swr } = useResourceRuntime();
  return <SWRConfig value={() => swr}>{children}</SWRConfig>;
}
export function useResourceRuntime(): Runtime {
  const runtime = useContext(Context);
  if (!runtime) throw new Error('Missing ResourceRuntimeProvider.');
  return runtime;
}
