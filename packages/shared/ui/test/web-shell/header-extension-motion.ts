import { act } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/** Advance animation frames explicitly; nested frames always run on the next step. */
export function controlExtensionFrames() {
  const frames = new Map<number, FrameRequestCallback>();
  let nextId = 0;
  beforeEach(() => {
    frames.clear();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = ++nextId;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  });
  afterEach(() => vi.unstubAllGlobals());
  return {
    pending: () => frames.size,
    async advance(count = 1): Promise<void> {
      for (let step = 0; step < count; step++) {
        await act(async () => {
          const current = [...frames.entries()];
          for (const [id, callback] of current) {
            if (!frames.delete(id)) continue;
            callback(performance.now());
          }
          await Promise.resolve();
        });
      }
    },
  };
}
