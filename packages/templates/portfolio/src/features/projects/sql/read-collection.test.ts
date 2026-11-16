import { PortfolioDataError } from '@frontend/portfolio/server';
import { expect, it, vi } from 'vitest';
import { PORTFOLIO_SOURCE_HEADER } from './http-contract';
import { collectionResponse, readCollection } from './read-collection';

vi.mock('server-only', () => ({}));

it('rejects an old source before querying and labels successful data with the actual source', async () => {
  const source = () => Promise.resolve('current');
  const query = vi.fn(() => Promise.resolve([]));
  const conflict = collectionResponse(await readCollection(source, query, 'previous'));
  expect(conflict.status).toBe(409);
  expect(await conflict.json()).toEqual({ code: 'source-changed' });
  expect(query).not.toHaveBeenCalled();
  const success = collectionResponse(await readCollection(source, query, 'current'));
  expect(await success.json()).toEqual([]);
  expect(success.headers.get(PORTFOLIO_SOURCE_HEADER)).toBe('current');
  expect(success.headers.get('Cache-Control')).toBe('private, no-store');
});

it.each([
  { error: new Error('private configuration'), code: 'data-source-unavailable', status: 503 },
  {
    error: new PortfolioDataError('invalid-project-row', 'private row'),
    code: 'invalid-data',
    status: 500,
  },
])('reports $code without disclosing the original error', async ({ error, code, status }) => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const result = await readCollection(
      () => Promise.resolve('current'),
      () => Promise.reject(error)
    );
    const response = collectionResponse(result);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ code });
    expect(log).toHaveBeenCalledWith('Portfolio collection read failed', error);
  } finally {
    log.mockRestore();
  }
});
