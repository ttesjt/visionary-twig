import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import useSWRImmutable from 'swr/immutable';
import { useSWRConfig } from 'swr';
import {
  ResourceError,
  type PlannedResource,
  type PreparedResource,
  type PreparedResources,
  type ResourcePlan,
} from '../core/contracts.js';
import { useResourceRuntime } from './context.js';
function ResourceRequest({
  resource,
  initial,
  report,
  fail,
}: {
  readonly resource: PlannedResource;
  readonly initial: PreparedResource | undefined;
  readonly report: (entry: PreparedResource) => void;
  readonly fail: (error: ResourceError) => void;
}) {
  const { cache, fetchResource } = useResourceRuntime();
  useLayoutEffect(() => cache.retain(resource.key), [cache, resource.key]);
  const { data, error } = useSWRImmutable<PreparedResource, ResourceError>(
    resource.key,
    () => fetchResource(resource),
    { ...(initial ? { fallbackData: initial } : {}), shouldRetryOnError: false }
  );
  const { mutate } = useSWRConfig();
  useEffect(() => {
    if (initial) void mutate(resource.key, initial, { revalidate: false });
  }, [initial, mutate, resource.key]);
  useEffect(() => {
    if (data) report(data);
    if (error) fail(error);
  }, [data, error, report, fail]);
  return null;
}
export function ResourceBatch({
  plan,
  initial,
  ready,
  fail,
}: {
  readonly plan: ResourcePlan;
  readonly initial: readonly PreparedResource[] | undefined;
  readonly ready: (value: PreparedResources) => void;
  readonly fail: (error: ResourceError) => void;
}) {
  const [entries, setEntries] = useState(
    () => new Map(initial?.map((entry) => [entry.key, entry]))
  );
  const report = useCallback(
    (entry: PreparedResource) =>
      setEntries((previous) =>
        previous.get(entry.key) === entry ? previous : new Map(previous).set(entry.key, entry)
      ),
    []
  );
  const prepared = useMemo(() => {
    const resources: PreparedResource[] = [];
    for (const resource of plan.resources) {
      const entry = entries.get(resource.key);
      if (!entry) return undefined;
      resources.push(entry);
    }
    return Object.freeze({
      planKey: plan.key,
      context: plan.context,
      resources: Object.freeze(resources),
    });
  }, [plan, entries]);
  useEffect(() => {
    if (prepared) ready(prepared);
  }, [prepared, ready]);
  return (
    <>
      {plan.resources.map((resource) => (
        <ResourceRequest
          key={resource.key}
          resource={resource}
          initial={initial?.find((entry) => entry.key === resource.key)}
          report={report}
          fail={fail}
        />
      ))}
    </>
  );
}
