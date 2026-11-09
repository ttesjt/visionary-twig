import { useCallback, useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createResourcePlan, type ResourceReader } from '../index.js';
import { ResourceBoundary } from './boundary.js';
import { ResourceRuntimeProvider } from './context.js';
const plan = createResourcePlan([
  {
    id: 'example',
    source: 'fixture',
    url: '/example.json',
    version: '1',
    schemaVersion: '1',
    validateArtifact(value) {
      if (typeof value !== 'string') throw new Error('Expected a string');
    },
  },
]);
it('retries failed publication against the downloaded result and preserves its cause', async () => {
  let invalid = true;
  const cause = new Error('Reader collision');
  const publish = vi.fn(() => {
    if (invalid) throw cause;
  });
  const read = vi.fn<ResourceReader>(() => Promise.resolve('downloaded'));
  const errors: unknown[] = [];
  function Region() {
    const [ready, setReady] = useState(false);
    const activate = useCallback(() => {
      publish();
      setReady(true);
    }, []);
    return (
      <ResourceBoundary
        plan={plan}
        publication={{ ready, publish: activate }}
        pending={<p>pending</p>}
        failure={(error, retry) => {
          errors.push(error.cause);
          return <button onClick={retry}>{error.kind}</button>;
        }}
      >
        {() => <p>complete</p>}
      </ResourceBoundary>
    );
  }
  render(
    <ResourceRuntimeProvider reader={read}>
      <Region />
    </ResourceRuntimeProvider>
  );
  await screen.findByRole('button', { name: 'invalid-data' });
  expect(screen.queryByText('pending')).toBeNull();
  expect(screen.queryByText('complete')).toBeNull();
  expect(publish).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button'));
  await screen.findByRole('button', { name: 'invalid-data' });
  expect(publish).toHaveBeenCalledTimes(2);
  invalid = false;
  fireEvent.click(screen.getByRole('button'));
  await screen.findByText('complete');
  expect(publish).toHaveBeenCalledTimes(3);
  expect(read).toHaveBeenCalledTimes(1);
  expect(errors.every((error) => error === cause)).toBe(true);
});
