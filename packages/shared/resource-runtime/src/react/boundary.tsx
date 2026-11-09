import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ResourceError,
  type PreparedResources,
  type ResourcePlan,
  type PreparedResource,
} from '../core/contracts.js';
import { restoreResourceSnapshot, restoreResourceEntries } from '../core/snapshot.js';
import { ResourceBatch } from './batch.js';
import { ResourceRequestScope, useResourceRuntime } from './context.js';
import { RESOURCE_SNAPSHOT_VERSION } from '../core/constants.js';
export function ResourceBoundary({
  plan,
  initialSnapshot,
  initialResources,
  pending,
  failure,
  publication,
  children,
}: {
  readonly plan: ResourcePlan;
  readonly initialSnapshot?: unknown;
  readonly initialResources?: readonly PreparedResource[];
  /** Host-owned reader publication is part of initialization; ready allows synchronous SSR rendering. */
  readonly publication?: {
    readonly ready: boolean;
    readonly publish: (value: PreparedResources) => void;
  };
  readonly pending: ReactNode;
  readonly failure: (error: ResourceError, retry: () => void) => ReactNode;
  readonly children: (value: PreparedResources, status: 'ready' | 'switching') => ReactNode;
}) {
  const {
    cache,
    swr: { mutate },
  } = useResourceRuntime();
  const readSeed = () => {
    if (initialSnapshot !== undefined && initialResources !== undefined)
      throw new Error('Choose initialSnapshot or initialResources, not both.');
    return initialSnapshot === undefined
      ? restoreResourceEntries(plan, initialResources ?? [])
      : restoreResourceSnapshot(plan, initialSnapshot).resources;
  };
  const [seed, setSeed] = useState(() => ({
    input: initialSnapshot,
    entriesInput: initialResources,
    planKey: plan.key,
    entries: readSeed(),
  }));
  // Seeds belong to the plan observed when their props change, just like complete snapshots.
  let currentSeed = seed;
  if (initialSnapshot !== seed.input || initialResources !== seed.entriesInput) {
    currentSeed = {
      input: initialSnapshot,
      entriesInput: initialResources,
      planKey: plan.key,
      entries: readSeed(),
    };
    setSeed(currentSeed);
  }
  const initial = currentSeed.planKey === plan.key ? currentSeed.entries : undefined;
  // A layout-wide locale commit must let every nested boundary consume its
  // already-prepared target in the same render, rather than one effect later.
  const available = useMemo(() => {
    const seeded = new Map(initial?.map((entry) => [entry.key, entry]));
    const resources = plan.resources.map(
      (entry) => seeded.get(entry.key) ?? cache.get(entry.key)?.data
    );
    if (resources.some((entry) => entry === undefined)) return undefined;
    return restoreResourceSnapshot(plan, {
      version: RESOURCE_SNAPSHOT_VERSION,
      planKey: plan.key,
      resources,
    });
  }, [initial, plan, cache]);
  const [committed, setCommitted] = useState<PreparedResources | undefined>(available);
  if (available && committed?.planKey !== available.planKey) setCommitted(available);
  const visible = available ?? committed;
  const [error, setError] = useState<{
    readonly key: string;
    readonly value: ResourceError;
    readonly phase: 'load' | 'publication';
  }>();
  const [publicationAttempt, setPublicationAttempt] = useState(0);
  const currentError = error?.key === plan.key ? error : undefined;
  const wanted = useRef(plan.key);
  useLayoutEffect(() => {
    wanted.current = plan.key;
  }, [plan.key]);
  const ready = useCallback((value: PreparedResources) => {
    if (wanted.current === value.planKey) {
      setCommitted(value);
      // A late transport-ready notification cannot erase a failed reader publication.
      setError((previous) =>
        previous?.key === value.planKey && previous.phase === 'publication' ? previous : undefined
      );
    }
  }, []);
  const fail = useCallback(
    (value: ResourceError) => {
      if (wanted.current === plan.key) setError({ key: plan.key, value, phase: 'load' });
    },
    [plan.key]
  );
  const publish = publication?.publish;
  const published = publication?.ready;
  useEffect(() => {
    if (!publish || published) {
      setError((previous) => (previous?.phase === 'publication' ? undefined : previous));
      return;
    }
    if (!visible || visible.planKey !== plan.key || currentError?.phase === 'publication') return;
    try {
      publish(visible);
    } catch (cause: unknown) {
      if (wanted.current === plan.key)
        setError({
          key: plan.key,
          phase: 'publication',
          value:
            cause instanceof ResourceError
              ? cause
              : new ResourceError('invalid-data', 'publication', { cause }),
        });
    }
  }, [publish, published, visible, plan.key, publicationAttempt, currentError?.phase]);
  const retry = useCallback(() => {
    setError(undefined);
    setPublicationAttempt((value) => value + 1);
    // Downloaded artifacts remain valid. Retry the host's reader construction directly.
    if (currentError?.phase === 'publication') return;
    void Promise.all(
      plan.resources
        .filter((resource) => {
          const cached = cache.get(resource.key);
          return !cached?.data || cached.error !== undefined;
        })
        .map((resource) => mutate(resource.key))
    ).catch((cause: unknown) =>
      fail(
        cause instanceof ResourceError ? cause : new ResourceError('network', 'retry', { cause })
      )
    );
  }, [cache, mutate, plan, fail, currentError?.phase]);
  return (
    <>
      <ResourceRequestScope>
        <ResourceBatch
          key={plan.key}
          plan={plan}
          initial={available?.resources ?? initial}
          ready={ready}
          fail={fail}
        />
      </ResourceRequestScope>
      {visible && (!publication || publication.ready)
        ? children(visible, visible.planKey === plan.key ? 'ready' : 'switching')
        : currentError
          ? null
          : pending}
      {currentError ? failure(currentError.value, retry) : null}
    </>
  );
}
