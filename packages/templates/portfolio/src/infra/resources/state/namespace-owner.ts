'use client';
import { useMemo, useState, useRef, useLayoutEffect, useCallback } from 'react';
import {
  restoreResourceSnapshot,
  type ResourcePlan,
  type PreparedResources,
} from '@frontend/resource-runtime';
import { useCachedResources } from '@frontend/resource-runtime/react';
import { appendBatch, type NamespaceBatch } from '../preparation/namespace-batch';
import { selectPreparedResources } from '../preparation/prepared';
import { NamespaceClaims } from './namespace-claims';

interface Candidate<R, V> extends NamespaceBatch {
  readonly resource: R;
  readonly parent?: V | undefined;
  readonly view?: V | undefined;
}
interface OwnerOptions<R, V> {
  readonly plan: ResourcePlan;
  readonly initialPlan: ResourcePlan;
  readonly initialSnapshot?: unknown;
  readonly parent?:
    { readonly reader: V | undefined; readonly claims: NamespaceClaims } | undefined;
  readonly validateRequest?: (request: ResourcePlan, active: ResourcePlan) => void;
  readonly onMembershipChange?: () => void;
  readonly build: (data: PreparedResources, plan: ResourcePlan) => R;
  readonly view: (resource: R, parent: V | undefined, plan: ResourcePlan) => V;
}

/** Owns one mounted Provider's immutable publications. Only its initial plan gates startup. */
export function useNamespaceOwner<R, V>({
  plan,
  initialPlan,
  initialSnapshot,
  parent,
  build,
  view,
  onMembershipChange,
  validateRequest,
}: OwnerOptions<R, V>) {
  const parentReader = parent?.reader;
  const hasParent = parent !== undefined;
  const [claims] = useState(() => new NamespaceClaims());
  const make = useCallback(
    (batch: NamespaceBatch): Candidate<R, V> => ({
      ...batch,
      resource: build(batch.prepared, batch.plan),
    }),
    [build]
  );
  const supplied = useMemo(
    () =>
      initialSnapshot === undefined
        ? undefined
        : make({
            plan: initialPlan,
            prepared: restoreResourceSnapshot(initialPlan, initialSnapshot),
          }),
    [initialSnapshot, initialPlan, make]
  );
  const cached = useCachedResources(plan);
  const fallback = useMemo(
    () => (supplied?.plan.key === plan.key ? supplied : cached && make({ plan, prepared: cached })),
    [supplied, cached, plan, make]
  );
  type Published = { readonly baseKey: string; readonly candidate: Candidate<R, V> };
  const [published, setPublished] = useState<Published | undefined>(
    () => supplied && { baseKey: initialPlan.key, candidate: supplied }
  );
  const [origin, setOrigin] = useState({ key: initialPlan.key, snapshot: initialSnapshot });
  let active = published;
  if (origin.key !== initialPlan.key || origin.snapshot !== initialSnapshot) {
    setOrigin({ key: initialPlan.key, snapshot: initialSnapshot });
    if (origin.key !== initialPlan.key || !active)
      active = supplied && { baseKey: initialPlan.key, candidate: supplied };
    else if (supplied && active.baseKey === initialPlan.key) {
      // A new SSR snapshot replaces the declared inputs; appended namespaces keep their lifetime.
      const previous = active.candidate;
      const batch = selectPreparedResources(previous.plan, [
        ...previous.prepared.resources,
        ...supplied.prepared.resources,
      ]);
      active = {
        baseKey: initialPlan.key,
        candidate:
          previous.plan.key === initialPlan.key
            ? supplied
            : make({ plan: previous.plan, prepared: batch }),
      };
    }
    setPublished(active);
  }
  const local = active?.baseKey === plan.key ? active.candidate : fallback;
  const effective = local?.plan ?? plan;
  const reader = useMemo(() => {
    if (!local || (hasParent && !parentReader)) return undefined;
    return local.view && local.parent === parentReader
      ? local.view
      : view(local.resource, parentReader, local.plan);
  }, [local, hasParent, parentReader, view]);

  // Effects from siblings can publish in one React batch, before either sibling renders again.
  // The cursor tracks the last successful commit, never a speculative render or a staged candidate.
  const epoch = useMemo(
    () => ({ baseKey: plan.key, origin: initialPlan.key, snapshot: initialSnapshot }),
    [plan.key, initialPlan.key, initialSnapshot]
  );
  const cursor = useRef<
    { epoch: object; local: typeof local; parent: typeof parentReader } | undefined
  >(undefined);
  useLayoutEffect(() => {
    cursor.current = { epoch, local, parent: parentReader };
    claims.update(effective.resources.map((entry) => entry.id));
    return () => {
      cursor.current = undefined;
    };
  }, [epoch, local, parentReader, claims, effective]);
  const parentClaims = parent?.claims;
  useLayoutEffect(() => parentClaims?.attach(claims), [parentClaims, claims]);

  const preparePublication = useCallback(
    (data: PreparedResources, request: ResourcePlan) => {
      validateRequest?.(request, plan);
      const stage = (last: NonNullable<typeof cursor.current>) => {
        const batch = appendBatch(plan, last.local, request, data);
        if (!batch) return undefined;
        const owned = new Set((last.local?.plan ?? plan).resources.map((entry) => entry.id));
        claims.assertAvailable(
          request.resources.filter((entry) => !owned.has(entry.id)).map((entry) => entry.id)
        );
        if (hasParent && !last.parent) throw new Error('Parent resource scope is not ready.');
        const candidate = make(batch);
        return {
          ...candidate,
          parent: last.parent,
          view: view(candidate.resource, last.parent, batch.plan),
        };
      };
      const before = cursor.current;
      if (before?.epoch !== epoch) return () => {};
      const staged = stage(before);
      return () => {
        const latest = cursor.current;
        if (latest?.epoch !== epoch) return;
        const candidate = latest === before ? staged : stage(latest);
        if (!candidate) return;
        cursor.current = { ...latest, local: candidate };
        claims.update(candidate.plan.resources.map((entry) => entry.id));
        if (candidate.plan.resources.length !== (latest.local?.plan ?? plan).resources.length)
          onMembershipChange?.();
        setPublished({ baseKey: plan.key, candidate });
      };
    },
    [epoch, plan, make, view, hasParent, claims, onMembershipChange, validateRequest]
  );

  // Stage a complete replacement for a new base plan; the coordinator chooses when to commit.
  const preparePlanChange = useCallback(
    (base: ResourcePlan, batch: NamespaceBatch) => {
      const candidate = make(batch);
      return () => {
        cursor.current = undefined;
        setPublished({ baseKey: base.key, candidate });
      };
    },
    [make]
  );
  return {
    plan: effective,
    prepared: local?.prepared,
    resource: local?.resource,
    reader,
    preparePublication,
    preparePlanChange,
    claims,
  };
}
