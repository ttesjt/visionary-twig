import 'server-only';
import { PortfolioDataError } from '@frontend/portfolio/server';
import { PORTFOLIO_SOURCE_HEADER } from './http-contract';
import type { PortfolioRead } from './http-contract';

export async function readCollection<T>(
  sourceId: () => Promise<string>,
  query: () => Promise<T>,
  expectedSource?: string
): Promise<PortfolioRead<T>> {
  try {
    const source = await sourceId();
    if (expectedSource !== undefined && expectedSource !== source)
      return { status: 'failed', code: 'source-changed' };
    return { status: 'ready', source, data: await query() };
  } catch (error) {
    console.error('Portfolio collection read failed', error);
    return {
      status: 'failed',
      code: error instanceof PortfolioDataError ? 'invalid-data' : 'data-source-unavailable',
    };
  }
}

export function collectionResponse<T>(result: PortfolioRead<T>): Response {
  const headers = new Headers({ 'Cache-Control': 'private, no-store' });
  if (result.status === 'ready') {
    headers.set(PORTFOLIO_SOURCE_HEADER, result.source);
    return Response.json(result.data, { headers });
  }
  const status = {
    'invalid-query': 400,
    'source-changed': 409,
    'data-source-unavailable': 503,
    'invalid-data': 500,
  }[result.code];
  return Response.json({ code: result.code }, { headers, status });
}
