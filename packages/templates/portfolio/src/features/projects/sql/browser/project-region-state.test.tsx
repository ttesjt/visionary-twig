import { Suspense, type ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { expect, it, vi } from 'vitest';
import type { PortfolioRead } from '../http-contract';
import { useProjectRegion, useProjectRequest } from './project-region-state';
import { ProjectRequestError, type ProjectResponse } from './project-requests';

const SOURCE = 'sample-source';
const rememberSource = () => {};

function snapshot(data: string): Promise<PortfolioRead<string>> {
  return Promise.resolve({ status: 'ready', source: SOURCE, data });
}

function Region({
  seed,
  read,
}: {
  readonly seed?: Promise<PortfolioRead<string>> | undefined;
  readonly read: () => Promise<ProjectResponse<string>>;
}) {
  const request = useProjectRequest({
    url: '/api/projects?locale=en&page=1',
    cacheSource: SOURCE,
    expectedSource: SOURCE,
    seed,
    read,
    onSource: rememberSource,
  });
  return (
    <>
      <button type="button" onClick={request.retry}>
        Retry
      </button>
      <Suspense fallback={<p>Waiting for snapshot</p>}>
        <Result request={request} />
      </Suspense>
    </>
  );
}

function Result({ request }: { readonly request: ReturnType<typeof useProjectRequest<string>> }) {
  const region = useProjectRegion(request, SOURCE);
  return <p>{region.status === 'ready' ? region.data : region.status}</p>;
}

function createCacheScope() {
  return function CacheScope({ children }: { readonly children: ReactNode }) {
    return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
  };
}

it.each(['data', 'error'] as const)(
  'uses a new SSR snapshot when the same query already has cached %s',
  async (cached) => {
    const read = vi.fn<() => Promise<ProjectResponse<string>>>();
    if (cached === 'data') read.mockResolvedValue({ source: SOURCE, data: 'Cached project' });
    else read.mockRejectedValue(new ProjectRequestError('data-source-unavailable'));
    const { rerender } = render(<Region read={read} />, { wrapper: createCacheScope() });
    await screen.findByText(cached === 'data' ? 'Cached project' : 'failed');

    const fresh = snapshot('Fresh SSR project');
    await act(async () => {
      rerender(<Region read={read} seed={fresh} />);
      await fresh;
    });
    expect(screen.getByText('Fresh SSR project')).toBeVisible();
    expect(screen.queryByText('Cached project')).not.toBeInTheDocument();
    expect(screen.queryByText('failed')).not.toBeInTheDocument();
    expect(read).toHaveBeenCalledTimes(1);

    read.mockResolvedValue({ source: SOURCE, data: 'Latest retry' });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('Latest retry');
    expect(read).toHaveBeenCalledTimes(2);
  }
);

it.each(['data', 'error'] as const)(
  'replaces an earlier SSR snapshot and its retried %s with a new snapshot',
  async (retried) => {
    const read = vi.fn<() => Promise<ProjectResponse<string>>>();
    if (retried === 'data') read.mockResolvedValue({ source: SOURCE, data: 'Earlier retry' });
    else read.mockRejectedValue(new ProjectRequestError('data-source-unavailable'));
    const seed = snapshot('Earlier SSR project');
    const { rerender } = await act(async () => {
      await seed;
      return render(<Region read={read} seed={seed} />, { wrapper: createCacheScope() });
    });
    await screen.findByText('Earlier SSR project');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText(retried === 'data' ? 'Earlier retry' : 'failed');
    rerender(<Region read={read} seed={seed} />);
    expect(screen.getByText(retried === 'data' ? 'Earlier retry' : 'failed')).toBeVisible();

    const latest = snapshot('Latest SSR project');
    await act(async () => {
      rerender(<Region read={read} seed={latest} />);
      await latest;
    });
    expect(screen.getByText('Latest SSR project')).toBeVisible();
    expect(screen.queryByText('Earlier retry')).not.toBeInTheDocument();
    expect(screen.queryByText('failed')).not.toBeInTheDocument();
    expect(read).toHaveBeenCalledTimes(1);
  }
);

it('keeps an earlier in-flight retry from overwriting a new SSR snapshot', async () => {
  let complete = (_response: ProjectResponse<string>) => {};
  const pending = new Promise<ProjectResponse<string>>((resolve) => {
    complete = resolve;
  });
  const read = vi.fn(() => pending);
  const seed = snapshot('Earlier SSR project');
  const { rerender } = await act(async () => {
    await seed;
    return render(<Region read={read} seed={seed} />, {
      wrapper: createCacheScope(),
    });
  });
  await screen.findByText('Earlier SSR project');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(read).toHaveBeenCalledTimes(1);
  const latest = snapshot('Latest SSR project');
  await act(async () => {
    rerender(<Region read={read} seed={latest} />);
    await latest;
  });
  expect(screen.getByText('Latest SSR project')).toBeVisible();

  await act(async () => {
    complete({ source: SOURCE, data: 'Earlier retry' });
    await pending;
  });
  expect(screen.getByText('Latest SSR project')).toBeVisible();
  expect(screen.queryByText('Earlier retry')).not.toBeInTheDocument();
});

it('shares the client request and its cached result between consumers without an SSR snapshot', async () => {
  const read = vi.fn(() => Promise.resolve({ source: SOURCE, data: 'Shared project' }));
  const { rerender } = render(
    <>
      <Region read={read} />
      <Region read={read} />
    </>,
    {
      wrapper: createCacheScope(),
    }
  );
  expect(await screen.findAllByText('Shared project')).toHaveLength(2);
  expect(read).toHaveBeenCalledTimes(1);

  rerender(<Region read={read} />);
  expect(screen.getByText('Shared project')).toBeVisible();
  expect(read).toHaveBeenCalledTimes(1);
});
