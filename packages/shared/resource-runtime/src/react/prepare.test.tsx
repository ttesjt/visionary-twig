import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createResourcePlan } from '../core/plan.js';
import type { ResourceReader } from '../core/contracts.js';
import { ResourceRuntimeProvider } from './context.js';
import { useCachedResources, usePrepareResources } from './prepare.js';

const plan = (locale: string) =>
  createResourcePlan(
    [
      {
        id: 'page',
        url: '/' + locale,
        version: '1',
        schemaVersion: '1',
        source: 'example',
        validateArtifact: (value: unknown): undefined => {
          if (typeof value !== 'string') throw new Error('Expected string');
        },
      },
    ],
    { locale }
  );
it('reads a complete prefetched plan in the coordinated render without fetching or exposing another locale', async () => {
  const read = vi.fn<ResourceReader>((entry) => Promise.resolve(entry.url));
  const en = plan('en');
  const zh = plan('zh');
  function Demo() {
    const [selected, select] = useState(en);
    const value = useCachedResources(selected);
    const prepare = usePrepareResources();
    return (
      <>
        <p>{value?.context.locale ?? 'missing'}</p>
        <button
          onClick={() => {
            void prepare(zh).then(() => select(zh));
          }}
        >
          prepare
        </button>
      </>
    );
  }
  render(
    <ResourceRuntimeProvider reader={read}>
      <Demo />
    </ResourceRuntimeProvider>
  );
  expect(screen.getByText('missing')).toBeDefined();
  expect(read).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(screen.getByText('zh')).toBeDefined());
  expect(read).toHaveBeenCalledTimes(1);
});
