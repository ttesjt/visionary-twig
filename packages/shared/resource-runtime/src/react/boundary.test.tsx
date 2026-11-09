import { StrictMode, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResourceBoundary } from './boundary.js';
import { ResourceRuntimeProvider } from './context.js';
import { ResourceCache } from './cache.js';
import useSWR, { SWRConfig, useSWRConfig, type Cache } from 'swr';
import { usePrepareResources } from './prepare.js';
import { createResourcePlan } from '../core/plan.js';
import { prepareResourcePlan } from '../core/load.js';
import type { PreparedResources, ResourceReader } from '../core/contracts.js';
const validateArtifact = (input: unknown): undefined => {
  if (typeof input !== 'string') throw new Error('string');
};
const plan = (locale: string) =>
  createResourcePlan(
    ['common', 'page'].map((id) => ({
      id,
      version: '1',
      schemaVersion: '1',
      source: 'public',
      url: `/${locale}/${id}`,
      validateArtifact,
    })),
    { locale }
  );
function Content({ value }: { readonly value: PreparedResources }) {
  const [count, setCount] = useState(0);
  return (
    <>
      <p>{value.context.locale}</p>
      <button onClick={() => setCount(count + 1)}>{count}</button>
    </>
  );
}
function Demo({
  locale,
  reader,
  snapshot,
}: {
  readonly locale: string;
  readonly reader: ResourceReader;
  readonly snapshot?: unknown;
}) {
  return (
    <ResourceRuntimeProvider reader={reader}>
      <ResourceBoundary
        plan={plan(locale)}
        initialSnapshot={snapshot}
        pending={<p>pending</p>}
        failure={(error, retry) => <button onClick={retry}>{error.kind}</button>}
      >
        {(value) => <Content value={value} />}
      </ResourceBoundary>
    </ResourceRuntimeProvider>
  );
}
describe('initialization', () => {
  it('uses a complete SSR snapshot in the first render without requesting it again', async () => {
    const snapshot = await prepareResourcePlan(plan('en'), () => Promise.resolve('ready'));
    const reader = vi.fn<ResourceReader>();
    render(
      <StrictMode>
        <Demo locale="en" reader={reader} snapshot={snapshot} />
      </StrictMode>
    );
    expect(screen.getByText('en')).toBeDefined();
    expect(screen.queryByText('pending')).toBeNull();
    act(() => {});
    expect(reader).not.toHaveBeenCalled();
  });
  it('holds CSR content until all resources are available and deduplicates independent consumers', async () => {
    let release: ((value: string) => void) | undefined;
    const delayed = new Promise<string>((resolve) => {
      release = resolve;
    });
    const reader = vi.fn<ResourceReader>(async (entry) =>
      entry.id === 'page' ? delayed : 'ready'
    );
    const boundary = (
      <ResourceBoundary plan={plan('en')} pending={<p>pending</p>} failure={() => null}>
        {(value) => <p>{value.context.locale}</p>}
      </ResourceBoundary>
    );
    const { rerender } = render(
      <ResourceRuntimeProvider reader={reader}>
        {boundary}
        {boundary}
      </ResourceRuntimeProvider>
    );
    await waitFor(() => expect(reader).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('en')).toBeNull();
    rerender(<ResourceRuntimeProvider reader={reader}>{boundary}</ResourceRuntimeProvider>);
    await act(async () => {
      release?.('ready');
      await delayed;
    });
    expect(await screen.findByText('en')).toBeDefined();
    expect(reader).toHaveBeenCalledTimes(2);
  });
  it('preserves old content and state while switching, ignores stale completions and reuses cached language', async () => {
    let release: ((value: string) => void) | undefined;
    const delayed = new Promise<string>((resolve) => {
      release = resolve;
    });
    const reader = vi.fn<ResourceReader>(async (entry) =>
      entry.url.includes('/zh/') ? delayed : 'ready'
    );
    const snapshot = await prepareResourcePlan(plan('en'), () => Promise.resolve('ready'));
    const { rerender } = render(<Demo locale="en" reader={reader} snapshot={snapshot} />);
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    rerender(<Demo locale="zh" reader={reader} snapshot={snapshot} />);
    await waitFor(() => expect(reader).toHaveBeenCalledTimes(2));
    expect(screen.getByText('en')).toBeDefined();
    expect(screen.getByRole('button', { name: '1' })).toBeDefined();
    rerender(<Demo locale="en" reader={reader} snapshot={snapshot} />);
    await act(async () => {
      release?.('ready');
      await delayed;
    });
    expect(screen.queryByText('zh')).toBeNull();
    expect(screen.getByRole('button', { name: '1' })).toBeDefined();
    rerender(<Demo locale="zh" reader={reader} snapshot={snapshot} />);
    expect(await screen.findByText('zh')).toBeDefined();
    expect(reader).toHaveBeenCalledTimes(2);
  });
  it('retries failure without publishing incomplete content', async () => {
    let fail = true;
    const reader = vi.fn<ResourceReader>(() =>
      fail ? Promise.reject(new Error('offline')) : Promise.resolve('ready')
    );
    render(<Demo locale="en" reader={reader} />);
    const retry = await screen.findByRole('button', { name: 'network' });
    expect(screen.queryByText('en')).toBeNull();
    fail = false;
    fireEvent.click(retry);
    expect(await screen.findByText('en')).toBeDefined();
  });
  it('evicts inactive cache entries while retaining active readers', async () => {
    const cache = new ResourceCache(1);
    const release = cache.retain('active');
    cache.set('active', {});
    cache.set('old', {});
    cache.set('new', {});
    await Promise.resolve();
    expect([...cache.keys()]).toEqual(['active', 'new']);
    release();
    await Promise.resolve();
    expect([...cache.keys()]).toEqual(['new']);
  });
});

it('disposes pending work on real provider unmount without breaking Strict Mode', async () => {
  const signals: AbortSignal[] = [];
  const reader = vi.fn<ResourceReader>((_resource, signal) => {
    signals.push(signal);
    return new Promise(() => {});
  });
  const { unmount } = render(
    <StrictMode>
      <Demo locale="en" reader={reader} />
    </StrictMode>
  );
  await waitFor(() => expect(reader).toHaveBeenCalledTimes(2));
  expect(signals.every((signal) => !signal.aborted)).toBe(true);
  unmount();
  await act(async () => {
    await Promise.resolve();
  });
  expect(signals.every((signal) => signal.aborted)).toBe(true);
});
it('accepts a later server snapshot without requiring the provider to remount', async () => {
  const reader = vi.fn<ResourceReader>();
  const en = await prepareResourcePlan(plan('en'), () => Promise.resolve('ready'));
  const ja = await prepareResourcePlan(plan('ja'), () => Promise.resolve('ready'));
  const { rerender } = render(<Demo locale="en" reader={reader} snapshot={en} />);
  fireEvent.click(screen.getByRole('button', { name: '0' }));
  rerender(<Demo locale="ja" reader={reader} snapshot={ja} />);
  expect(await screen.findByText('ja')).toBeDefined();
  expect(screen.getByRole('button', { name: '1' })).toBeDefined();
  expect(reader).not.toHaveBeenCalled();
  rerender(<Demo locale="en" reader={reader} snapshot={ja} />);
  expect(await screen.findByText('en')).toBeDefined();
  expect(screen.getByRole('button', { name: '1' })).toBeDefined();
  expect(reader).not.toHaveBeenCalled();
});

it('isolates layout resource reads, prefetch and retries from the ambient business SWR cache', async () => {
  const target = plan('en');
  const key = target.resources[0]?.key;
  if (!key) throw new Error('Missing resource key.');
  const businessCache: Cache<string> = new Map();
  const resourceReader = vi.fn<ResourceReader>(() => Promise.resolve('resource'));
  const businessReader = vi.fn(() => Promise.resolve('business'));
  function Business() {
    const { data } = useSWR(key, businessReader);
    const { mutate } = useSWRConfig();
    const prepare = usePrepareResources();
    return (
      <>
        <p>{data}</p>
        <button
          onClick={() => {
            void prepare(target);
          }}
        >
          prefetch
        </button>
        <button
          onClick={() => {
            void mutate(key, 'business-updated', { revalidate: false });
          }}
        >
          update
        </button>
      </>
    );
  }
  render(
    <SWRConfig value={{ provider: () => businessCache }}>
      <ResourceRuntimeProvider reader={resourceReader} inactiveCacheEntries={1}>
        <Business />
        <ResourceBoundary plan={target} pending={<p>pending</p>} failure={() => null}>
          {(prepared) => <p>{String(prepared.resources[0]?.value)}</p>}
        </ResourceBoundary>
      </ResourceRuntimeProvider>
    </SWRConfig>
  );
  await screen.findByText('resource');
  await screen.findByText('business');
  fireEvent.click(screen.getByRole('button', { name: 'prefetch' }));
  await waitFor(() => expect(resourceReader).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole('button', { name: 'update' }));
  await screen.findByText('business-updated');
  expect(screen.getByText('resource')).toBeDefined();
  expect(businessReader).toHaveBeenCalledTimes(1);
  expect(businessCache.get(key)?.data).toBe('business-updated');
});

it('reuses one runtime across nested boundaries and page unmounts', async () => {
  const reader = vi.fn<ResourceReader>(() => Promise.resolve('resource'));
  const definition = plan('en').resources[0];
  if (!definition) throw new Error('Missing layout resource.');
  const outer = createResourcePlan([definition], { scope: 'layout' });
  function Page() {
    return (
      <ResourceBoundary plan={plan('en')} pending={<p>page-pending</p>} failure={() => null}>
        {() => <p>page-ready</p>}
      </ResourceBoundary>
    );
  }
  function Layout({ show }: { readonly show: boolean }) {
    return (
      <ResourceRuntimeProvider reader={reader}>
        <ResourceBoundary plan={outer} pending={<p>layout-pending</p>} failure={() => null}>
          {() => (
            <>
              <p>layout-ready</p>
              {show ? <Page /> : null}
            </>
          )}
        </ResourceBoundary>
      </ResourceRuntimeProvider>
    );
  }
  const { rerender } = render(<Layout show />);
  await screen.findByText('page-ready');
  expect(reader).toHaveBeenCalledTimes(2);
  rerender(<Layout show={false} />);
  expect(screen.getByText('layout-ready')).toBeDefined();
  rerender(<Layout show />);
  expect(screen.getByText('page-ready')).toBeDefined();
  expect(screen.queryByText('page-pending')).toBeNull();
  expect(reader).toHaveBeenCalledTimes(2);
});

it('borrows a real business cache factory once and preserves sharing, dedupe and mutations across Runtime', async () => {
  const provider = vi.fn(() => new Map());
  const fetcher = vi.fn(() => Promise.resolve('shared-business'));
  const configs = new Map<string, ReturnType<typeof useSWRConfig>>();
  function Query({ id }: { readonly id: string }) {
    const config = useSWRConfig();
    configs.set(id, config);
    const { data } = useSWR('one-business-key', fetcher);
    return (
      <>
        <p data-testid={id}>{data}</p>
        <button
          onClick={() => {
            void config.mutate('one-business-key', 'updated-together', { revalidate: false });
          }}
        >
          {id}
        </button>
      </>
    );
  }
  render(
    <SWRConfig value={{ provider }}>
      <Query id="outside" />
      <ResourceRuntimeProvider reader={() => Promise.resolve('resource')}>
        <Query id="inside" />
      </ResourceRuntimeProvider>
    </SWRConfig>
  );
  await waitFor(() => expect(screen.getAllByText('shared-business')).toHaveLength(2));
  expect(provider).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(configs.get('inside')?.cache).toBe(configs.get('outside')?.cache);
  expect(configs.get('inside')?.mutate).toBe(configs.get('outside')?.mutate);
  fireEvent.click(screen.getByRole('button', { name: 'outside' }));
  await waitFor(() => expect(screen.getAllByText('updated-together')).toHaveLength(2));
  expect(provider).toHaveBeenCalledTimes(1);
});

it('imperative resource preparation inside a business scope seeds the private resource cache', async () => {
  const provider = vi.fn(() => new Map());
  const target = plan('en');
  const reader = vi.fn<ResourceReader>(() => Promise.resolve('resource'));
  function PreparePage() {
    const prepare = usePrepareResources();
    const [show, setShow] = useState(false);
    return (
      <>
        <button
          onClick={() => {
            void prepare(target).then(() => setShow(true));
          }}
        >
          prepare-page
        </button>
        {show ? (
          <ResourceBoundary plan={target} pending={<p>unexpected-pending</p>} failure={() => null}>
            {() => <p>prepared-page</p>}
          </ResourceBoundary>
        ) : null}
      </>
    );
  }
  render(
    <SWRConfig value={{ provider }}>
      <ResourceRuntimeProvider reader={reader}>
        <PreparePage />
      </ResourceRuntimeProvider>
    </SWRConfig>
  );
  fireEvent.click(screen.getByRole('button', { name: 'prepare-page' }));
  await screen.findByText('prepared-page');
  expect(reader).toHaveBeenCalledTimes(2);
  expect(provider).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('unexpected-pending')).toBeNull();
});

it('uses partial server entries immediately and fetches only missing resources', async () => {
  const target = plan('en');
  const snapshot = await prepareResourcePlan(target, () => Promise.resolve('server'));
  const common = target.resources.find((resource) => resource.id === 'common');
  const seeds = snapshot.resources.filter((entry) => entry.key === common?.key);
  let release = () => {};
  const hold = new Promise<void>((done) => {
    release = done;
  });
  const reader = vi.fn<ResourceReader>(async () => {
    await hold;
    return 'browser';
  });
  render(
    <StrictMode>
      <ResourceRuntimeProvider reader={reader}>
        <ResourceBoundary
          plan={target}
          initialResources={seeds}
          pending={<p>partial-pending</p>}
          failure={() => null}
        >
          {(value) => <p>{value.resources.map((entry) => entry.value).join('|')}</p>}
        </ResourceBoundary>
      </ResourceRuntimeProvider>
    </StrictMode>
  );
  await waitFor(() => expect(reader.mock.calls.map(([resource]) => resource.id)).toEqual(['page']));
  expect(screen.getByText('partial-pending')).toBeDefined();
  await act(async () => {
    release();
    await hold;
  });
  await screen.findByText('server|browser');
});
it('does not reuse a partial seed after the target changes unless new props are supplied', async () => {
  const origin = plan('en'),
    target = plan('zh');
  const seed = await prepareResourcePlan(origin, () => Promise.resolve('old'));
  const reader = vi.fn<ResourceReader>((entry) => Promise.resolve(entry.url));
  // Preserve the actual prop reference, as a server snapshot is commonly retained during navigation.
  const seeds = seed.resources.slice(0, 1);
  function Tree({ selected }: { readonly selected: typeof target }) {
    return (
      <ResourceRuntimeProvider reader={reader}>
        <ResourceBoundary
          plan={selected}
          initialResources={seeds}
          pending={<p>pending-target</p>}
          failure={() => null}
        >
          {(value) => <p>{value.context.locale}</p>}
        </ResourceBoundary>
      </ResourceRuntimeProvider>
    );
  }
  const view = render(<Tree selected={origin} />);
  await screen.findByText('en');
  view.rerender(<Tree selected={target} />);
  await screen.findByText('zh');
  expect(reader.mock.calls.filter(([resource]) => resource.url.startsWith('/zh/'))).toHaveLength(2);
});
