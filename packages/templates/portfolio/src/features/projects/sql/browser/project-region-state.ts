import { use } from 'react';
import useSWR from 'swr';
import type { PortfolioRead } from '../http-contract';
import {
  ProjectRequestError,
  type ProjectRequestFailure,
  type ProjectResponse,
} from './project-requests';

interface ProjectAttemptResult<T> extends ProjectResponse<T> {
  readonly seed: Promise<PortfolioRead<T>> | undefined;
}

class ProjectAttemptError extends ProjectRequestError {
  constructor(
    readonly seed: Promise<PortfolioRead<unknown>> | undefined,
    cause: unknown
  ) {
    super(cause instanceof ProjectRequestError ? cause.code : 'network', { cause });
  }
}

export type ProjectRegionState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: T }
  | { readonly status: 'failed'; readonly code: ProjectRequestFailure };

export function useProjectRequest<T>({
  url,
  cacheSource,
  expectedSource,
  seed,
  read,
  onSource,
}: {
  readonly url: string;
  readonly cacheSource?: string | undefined;
  readonly expectedSource?: string | undefined;
  readonly seed?: Promise<PortfolioRead<T>> | undefined;
  readonly read: (url: string, source?: string) => Promise<ProjectResponse<T>>;
  readonly onSource: (source: string) => void;
}) {
  const request = useSWR<ProjectAttemptResult<T>, ProjectAttemptError>(
    [url, cacheSource],
    async () => {
      try {
        const response = await read(url, expectedSource);
        onSource(response.source);
        return { ...response, seed };
      } catch (cause) {
        throw new ProjectAttemptError(seed, cause);
      }
    },
    {
      shouldRetryOnError: false,
      ...(seed ? { revalidateOnMount: false } : {}),
      revalidateOnFocus: !seed,
      revalidateOnReconnect: !seed,
    }
  );
  // A new SSR snapshot supersedes earlier cached attempts. Only requests begun
  // for this snapshot may replace it, including when an older request finishes late.
  return {
    response: request.data?.seed === seed ? request.data : undefined,
    error: request.error?.seed === seed ? request.error : undefined,
    pending: request.isValidating,
    retry: () => void request.mutate().catch(() => {}),
    seed,
  };
}

export type ProjectRequest<T> = ReturnType<typeof useProjectRequest<T>>;

/** Each visual region suspends on its own server seed, or consumes its own client request. */
export function useProjectRegion<T>(
  request: ProjectRequest<T>,
  source: string | undefined
): ProjectRegionState<T> {
  const seed = request.seed ? use(request.seed) : undefined;
  if (request.error) return { status: 'failed', code: request.error.code };
  const response = request.response ?? (seed?.status === 'ready' ? seed : undefined);
  if (response) {
    return source && response.source !== source
      ? { status: 'failed', code: 'source-changed' }
      : { status: 'ready', data: response.data };
  }
  if (seed?.status === 'failed' && !request.pending) return seed;
  return { status: 'loading' };
}
