import {
  DEFAULT_RESOURCE_CONCURRENCY,
  DEFAULT_MAX_PENDING_RESOURCES,
  DEFAULT_RESOURCE_TIMEOUT_MS,
  positiveInteger,
} from './constants.js';
import {
  ResourceError,
  type PlannedResource,
  type PreparedResource,
  type ResourcePlan,
  type ResourceReader,
  type ResourceFetcher,
  type ResourceSnapshot,
} from './contracts.js';
import { createResourceSnapshot, validateResource } from './snapshot.js';
export async function loadResource(
  resource: PlannedResource,
  reader: ResourceReader,
  timeoutMs = DEFAULT_RESOURCE_TIMEOUT_MS,
  signal?: AbortSignal
): Promise<PreparedResource> {
  positiveInteger(timeoutMs, 'timeoutMs');
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: (() => void) | undefined;
  const stopped = new Promise<never>((_, reject) => {
    cancel = () => {
      controller.abort();
      reject(new ResourceError('aborted', resource.id));
    };
    if (signal?.aborted) {
      cancel();
      return;
    }
    signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => {
      controller.abort();
      reject(new ResourceError('timeout', resource.id));
    }, timeoutMs);
  });
  try {
    const result = Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) throw new ResourceError('aborted', resource.id);
        return reader(resource, controller.signal);
      })
      .then((value) => validateResource(resource, value));
    return await Promise.race([result, stopped]);
  } catch (cause) {
    if (cause instanceof ResourceError) throw cause;
    throw new ResourceError('network', resource.id, { cause });
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (cancel) signal?.removeEventListener('abort', cancel);
  }
}
/** Owned by one provider/request; disposal cancels work without a global service. */
export function createResourceFetcher(
  reader: ResourceReader,
  options: {
    readonly concurrency?: number;
    readonly timeoutMs?: number;
    readonly maxPendingResources?: number;
  } = {}
): ResourceFetcher {
  const concurrency = positiveInteger(
    options.concurrency ?? DEFAULT_RESOURCE_CONCURRENCY,
    'concurrency'
  );
  const timeoutMs = positiveInteger(options.timeoutMs ?? DEFAULT_RESOURCE_TIMEOUT_MS, 'timeoutMs');
  const capacity = positiveInteger(
    options.maxPendingResources ?? DEFAULT_MAX_PENDING_RESOURCES,
    'maxPendingResources'
  );
  const lifetime = new AbortController();
  let active = 0;
  const waiting: (() => void)[] = [];
  const pending = new Map<string, Promise<PreparedResource>>();
  async function execute(
    resource: PlannedResource,
    external?: AbortSignal
  ): Promise<PreparedResource> {
    const signal = external ? AbortSignal.any([lifetime.signal, external]) : lifetime.signal;
    if (signal.aborted) throw new ResourceError('aborted', resource.id);
    const started = Date.now();
    if (active >= concurrency) {
      if (waiting.length >= capacity) throw new ResourceError('capacity', resource.id);
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timer);
          signal.removeEventListener('abort', cancel);
        };
        const start = () => {
          cleanup();
          resolve();
        };
        const stop = (kind: 'aborted' | 'timeout') => {
          const index = waiting.indexOf(start);
          if (index >= 0) waiting.splice(index, 1);
          cleanup();
          reject(new ResourceError(kind, resource.id));
        };
        const cancel = () => stop('aborted');
        const timer = setTimeout(() => stop('timeout'), timeoutMs);
        waiting.push(start);
        signal.addEventListener('abort', cancel, { once: true });
      });
    } else active++;
    try {
      const remaining = timeoutMs - (Date.now() - started);
      if (remaining <= 0) throw new ResourceError('timeout', resource.id);
      return await loadResource(resource, reader, remaining, signal);
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  }
  const fetchResource = (
    resource: PlannedResource,
    signal?: AbortSignal
  ): Promise<PreparedResource> => {
    if (signal) return execute(resource, signal);
    const existing = pending.get(resource.key);
    if (existing) return existing;
    const request = execute(resource).finally(() => {
      if (pending.get(resource.key) === request) pending.delete(resource.key);
    });
    pending.set(resource.key, request);
    return request;
  };
  return Object.assign(fetchResource, { dispose: () => lifetime.abort() });
}
export async function prepareResourcePlan(
  plan: ResourcePlan,
  reader: ResourceReader,
  options: {
    readonly timeoutMs?: number;
    readonly concurrency?: number;
    readonly signal?: AbortSignal;
  } = {}
): Promise<ResourceSnapshot> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (options.signal?.aborted) cancel();
  else options.signal?.addEventListener('abort', cancel, { once: true });
  const fetchResource = createResourceFetcher(reader, options);
  try {
    return createResourceSnapshot(
      plan,
      await Promise.all(
        plan.resources.map((resource) => fetchResource(resource, controller.signal))
      )
    );
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    options.signal?.removeEventListener('abort', cancel);
  }
}
