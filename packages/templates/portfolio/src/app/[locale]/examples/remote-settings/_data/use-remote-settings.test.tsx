import { cleanup, render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { afterEach, expect, it, vi } from 'vitest';
import { useRemoteSettings } from './use-remote-settings';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function Reader({ enabled = true }: { readonly enabled?: boolean }) {
  const { settings } = useRemoteSettings('compact', enabled);
  return <span>{settings.density}</span>;
}
it('deduplicates two independent consumers of the same resource', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ density: 'compact', showNote: false }));
  vi.stubGlobal('fetch', fetcher);
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <Reader />
      <Reader />
    </SWRConfig>
  );
  expect(await screen.findAllByText('compact')).toHaveLength(2);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('does not fetch with a null key and uses the declared default', () => {
  const fetcher = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetcher);
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <Reader enabled={false} />
    </SWRConfig>
  );
  expect(screen.getByText('comfortable')).toBeDefined();
  expect(fetcher).not.toHaveBeenCalled();
});
