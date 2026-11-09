import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { newDocument } from '../session/new-document.js';
import { usePreview } from './use-preview.js';
import type {
  StudioPreviewAdapter,
  StudioPreviewInput,
  StudioPreviewResult,
} from './preview-contract.js';

const input: StudioPreviewInput = {
  document: newDocument('preview'),
  context: {},
  theme: 'system',
};
function deferred() {
  let finish: (result: StudioPreviewResult) => void = () => {};
  const promise = new Promise<StudioPreviewResult>((resolve) => {
    finish = resolve;
  });
  return { promise, finish };
}
describe('isolated preview lifecycle', () => {
  it('ignores old responses even when the adapter ignores abort and allows a fresh request', async () => {
    const first = deferred();
    const second = deferred();
    const adapter = vi
      .fn<StudioPreviewAdapter>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(({ key }) => usePreview(adapter, input, key, true), {
      initialProps: { key: 1 },
    });
    let a = Promise.resolve();
    act(() => {
      a = result.current.request();
    });
    rerender({ key: 2 });
    expect(result.current.state.status).toBe('idle');
    let b = Promise.resolve();
    act(() => {
      b = result.current.request();
    });
    await act(async () => {
      second.finish({ ok: true, url: '/preview/new' });
      await b;
      first.finish({ ok: true, url: '/preview/old' });
      await a;
    });
    expect(result.current.state).toMatchObject({ status: 'ready', url: '/preview/new' });
  });
  it('does not revive a cancelled loading state when returning to the original input', async () => {
    const pending = deferred();
    const adapter = vi.fn<StudioPreviewAdapter>(() => pending.promise);
    const { result, rerender } = renderHook(({ value }) => usePreview(adapter, value, 1, true), {
      initialProps: { value: input },
    });
    let requested = Promise.resolve();
    act(() => {
      requested = result.current.request();
    });
    rerender({ value: { ...input, theme: 'dark' } });
    rerender({ value: input });
    expect(result.current.state.status).toBe('idle');
    await act(async () => {
      pending.finish({ ok: true, url: '/preview/old' });
      await requested;
    });
    expect(result.current.state.status).toBe('idle');
  });
  it('labels a previous snapshot stale after changing content/theme and blocks invalid requests', async () => {
    const adapter = vi.fn(() =>
      Promise.resolve<StudioPreviewResult>({ ok: true, url: '/preview/valid' })
    );
    const { result, rerender } = renderHook(
      ({ enabled, value }) => usePreview(adapter, value, 1, enabled),
      { initialProps: { enabled: true, value: input } }
    );
    await act(() => result.current.request());
    rerender({ enabled: false, value: { ...input, theme: 'dark' } });
    expect(result.current.stale).toBe(true);
    await act(() => result.current.request());
    expect(adapter).toHaveBeenCalledOnce();
  });
  it('automatically requests only applied input changes and discards late old snapshots', async () => {
    const old = deferred();
    const latest = deferred();
    const adapter = vi
      .fn<StudioPreviewAdapter>()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise);
    const { result, rerender } = renderHook(
      ({ value }) => usePreview(adapter, value, 1, true, true),
      { initialProps: { value: input } }
    );
    expect(adapter).toHaveBeenCalledTimes(1);
    rerender({ value: { ...input } });
    expect(adapter).toHaveBeenCalledTimes(1);
    rerender({ value: { ...input, context: { applied: true } } });
    expect(adapter).toHaveBeenCalledTimes(2);
    await act(async () => {
      latest.finish({ ok: true, url: '/preview/applied' });
      await latest.promise;
      old.finish({ ok: true, url: '/preview/obsolete' });
      await old.promise;
    });
    expect(result.current.state).toMatchObject({ status: 'ready', url: '/preview/applied' });
  });
});
