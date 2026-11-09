import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { it, expect, vi } from 'vitest';
import { createResourcePlan, prepareResourcePlan, type ResourceReader } from '../index.js';
import { ResourceRuntimeProvider } from './context.js';
import { useRetainResources } from './retain.js';
import { usePrepareResources } from './prepare.js';
const plan = (id: string) =>
  createResourcePlan([
    {
      id,
      url: '/resources/' + id,
      source: 'fixture',
      version: '1',
      schemaVersion: '1',
      validateArtifact: () => undefined,
    },
  ]);
it('seeds SSR props into the shared private cache and pins mounted scopes against inactive eviction', async () => {
  const a = plan('a'),
    b = plan('b'),
    c = plan('c');
  const snapshot = await prepareResourcePlan(a, () => Promise.resolve('from server'));
  const reader = vi.fn<ResourceReader>((r) => Promise.resolve(r.id));
  function Seed() {
    useRetainResources(a, snapshot);
    return null;
  }
  function Probe() {
    const prepare = usePrepareResources();
    const [result, setResult] = useState('');
    return (
      <>
        <button
          onClick={() => {
            void (async () => {
              await prepare(b);
              await prepare(c);
              const cached = await prepare(a);
              setResult(String(cached.resources[0]?.value));
            })();
          }}
        >
          load
        </button>
        <p>{result}</p>
      </>
    );
  }
  render(
    <ResourceRuntimeProvider reader={reader} inactiveCacheEntries={1}>
      <Seed />
      <Probe />
    </ResourceRuntimeProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'load' }));
  await screen.findByText('from server');
  expect(reader.mock.calls.map(([r]) => r.id)).toEqual(['b', 'c']);
});
it('releases retained entries on unmount so inactive cache bounds apply again', async () => {
  const a = plan('a'),
    b = plan('b');
  const snapshot = await prepareResourcePlan(a, () => Promise.resolve('seed'));
  const reader = vi.fn<ResourceReader>((r) => Promise.resolve(r.id));
  function Seed() {
    useRetainResources(a, snapshot);
    return null;
  }
  function App() {
    const [show, setShow] = useState(true);
    const prepare = usePrepareResources();
    return (
      <>
        {show && <Seed />}
        <button onClick={() => setShow(false)}>hide</button>
        <button
          onClick={() => {
            void prepare(b);
          }}
        >
          b
        </button>
        <button
          onClick={() => {
            void prepare(a);
          }}
        >
          a
        </button>
      </>
    );
  }
  render(
    <ResourceRuntimeProvider reader={reader} inactiveCacheEntries={1}>
      <App />
    </ResourceRuntimeProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'hide' }));
  fireEvent.click(screen.getByRole('button', { name: 'b' }));
  await waitFor(() => expect(reader).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'a' }));
  await waitFor(() => expect(reader).toHaveBeenCalledTimes(2));
});
