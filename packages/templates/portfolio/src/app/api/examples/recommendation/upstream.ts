import 'server-only';
import { readServerEnvironment } from '@/infra/environment/server';
import { readJson } from '@/infra/http/read-json';
import { exampleUpstreamEnvironmentSchema } from '@/site/environment';
import { recommendationSchema } from './contract';

const UPSTREAM_TIMEOUT_MS = 2_000;
export class UpstreamError extends Error {
  constructor(readonly kind: 'unavailable' | 'timeout' | 'invalid-response') {
    super('Example upstream request failed: ' + kind);
    this.name = 'UpstreamError';
  }
}

export async function fetchRecommendation(topic: string) {
  const environment = readServerEnvironment(exampleUpstreamEnvironmentSchema);
  const url = new URL(environment.EXAMPLE_UPSTREAM_URL);
  url.searchParams.set('topic', topic);
  const signal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Authorization: 'Bearer ' + environment.EXAMPLE_UPSTREAM_API_KEY },
      signal,
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      throw new UpstreamError('unavailable');
    }
    const json = await readJson(response);
    if (signal.aborted) throw new UpstreamError('timeout');
    const data = recommendationSchema.safeParse(json.ok ? json.value : undefined);
    if (!data.success) throw new UpstreamError('invalid-response');
    return data.data;
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    // A transport error can include a private URL. Publish the category alone.
    throw new UpstreamError(signal.aborted ? 'timeout' : 'unavailable');
  }
}
