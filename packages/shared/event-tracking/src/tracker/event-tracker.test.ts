import { describe, expect, it, vi } from 'vitest';
import { EventTracker } from '../index.js';
import type { JsonObject, TrackResult, EventSender } from '../index.js';

const URL = 'https://events.example.test/capture';
type Events = { site: { opened: { itemId: string } }; debug: Record<string, JsonObject> };

describe('EventTracker', () => {
  it('owns its registry without import-time or constructor delivery', async () => {
    const sender = vi.fn<EventSender>().mockResolvedValue({ httpStatus: 202 });
    const projects = { site: { url: URL }, debug: { url: null } };
    const tracker = new EventTracker<Events>({ projects, sender });
    projects.site.url = 'invalid';
    expect(sender).not.toHaveBeenCalled();
    expect(await tracker.track('site', 'opened', { itemId: 'a' })).toEqual({
      status: 'accepted',
      httpStatus: 202,
    });
    expect(sender.mock.calls[0]?.[0].url).toBe(URL);
  });
  it.each(['', 'relative', 'ftp://example.test', 'https://name:secret@example.test'])(
    'rejects invalid url %s',
    (url) => {
      expect(() => new EventTracker({ projects: { site: { url } } })).toThrow();
    }
  );
  it.each([0, -1, NaN, Infinity, 2_147_483_648])('rejects invalid timeout %s', (timeoutMs) => {
    expect(() => new EventTracker({ projects: {}, timeoutMs })).toThrow();
  });
  it('separates skipped, invalid keys and unregistered projects without validating payload', async () => {
    const sender = vi.fn();
    const validate = vi.fn();
    const onResult = vi.fn();
    const tracker = new EventTracker({
      projects: { site: { url: null, validate } },
      sender,
      onResult,
    });
    expect(
      await tracker.track('site', 'event', { ignored: undefined } as unknown as JsonObject)
    ).toEqual({ status: 'skipped', reason: 'unconfigured' });
    expect(await tracker.track('missing', 'event', {})).toEqual({
      status: 'failed',
      reason: 'unknown-project',
    });
    expect(await tracker.track('site', '', {})).toEqual({
      status: 'failed',
      reason: 'invalid-event',
    });
    expect(sender).not.toHaveBeenCalled();
    expect(validate).not.toHaveBeenCalled();
    expect(onResult).toHaveBeenCalledTimes(3);
  });

  it('skips every disabled call before validation, delivery or observation', async () => {
    const sender = vi.fn<EventSender>();
    const validate = vi.fn();
    const onResult = vi.fn();
    const tracker = new EventTracker({
      projects: { site: { url: URL, validate } },
      enabled: false,
      sender,
      onResult,
    });
    const skipped = { status: 'skipped', reason: 'disabled' };
    expect(await tracker.track('site', 'event', {})).toEqual(skipped);
    expect(await tracker.track('missing', '', {})).toEqual(skipped);
    expect(validate).not.toHaveBeenCalled();
    expect(sender).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it('uses the enabled state at the time of each track call', async () => {
    const sender = vi.fn<EventSender>().mockResolvedValue({ httpStatus: 202 });
    const tracker = new EventTracker({ projects: { site: { url: URL } }, enabled: false, sender });

    const before = tracker.track('site', 'before', {});
    tracker.setEnabled(true);
    const during = tracker.track('site', 'during', {});
    tracker.setEnabled(false);
    const after = tracker.track('site', 'after', {});

    expect(await Promise.all([before, during, after])).toEqual([
      { status: 'skipped', reason: 'disabled' },
      { status: 'accepted', httpStatus: 202 },
      { status: 'skipped', reason: 'disabled' },
    ]);
    expect(sender).toHaveBeenCalledTimes(1);
    expect(sender.mock.calls[0]?.[0].envelope.event).toBe('during');
  });

  it.each([false, true])(
    'suppresses the pending observer after disabling (re-enabled before completion: %s)',
    async (reEnable) => {
      let finish = () => {};
      const pending = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const sender = vi
        .fn<EventSender>()
        .mockImplementationOnce(async () => {
          await pending;
          return { httpStatus: 503 };
        })
        .mockResolvedValue({ httpStatus: 202 });
      const onResult = vi.fn();
      const tracker = new EventTracker({ projects: { site: { url: URL } }, sender, onResult });

      const inFlight = tracker.track('site', 'old', {});
      await vi.waitFor(() => expect(sender).toHaveBeenCalledOnce());
      tracker.setEnabled(false);
      if (reEnable) tracker.setEnabled(true);
      finish();
      expect(await inFlight).toEqual({ status: 'failed', reason: 'http-error', httpStatus: 503 });
      expect(onResult).not.toHaveBeenCalled();

      tracker.setEnabled(true);
      const next = tracker.track('site', 'new', {});
      tracker.setEnabled(true);
      const accepted = { status: 'accepted', httpStatus: 202 };
      expect(await next).toEqual(accepted);
      expect(onResult).toHaveBeenCalledExactlyOnceWith(
        { projectId: 'site', event: 'new', data: {} },
        accepted
      );
    }
  );

  it('rejects a non-boolean switch before changing the enabled state', async () => {
    const sender = vi.fn<EventSender>();
    const tracker = new EventTracker({ projects: { site: { url: URL } }, enabled: false, sender });
    // @ts-expect-error Exercise an invalid JavaScript caller.
    expect(() => tracker.setEnabled('false')).toThrow(TypeError);
    expect(await tracker.track('site', 'event', {})).toEqual({
      status: 'skipped',
      reason: 'disabled',
    });
    expect(sender).not.toHaveBeenCalled();
  });

  it('copies and freezes JSON before asynchronously sending and preserves the exact envelope', async () => {
    const sender = vi.fn<EventSender>().mockResolvedValue({ httpStatus: 204 });
    const tracker = new EventTracker({ projects: { site: { url: URL } }, sender });
    const data = { nested: { value: 'original' }, list: [1, true, null] };
    const result = tracker.track('site', 'event', data);
    data.nested.value = 'changed';
    await result;
    const request = sender.mock.calls[0]?.[0];
    if (!request) throw new Error('Expected a recorded send request');
    expect(request.envelope).toEqual({
      projectId: 'site',
      event: 'event',
      data: { nested: { value: 'original' }, list: [1, true, null] },
    });
    expect(Object.isFrozen(request.envelope.data.nested)).toBe(true);
    expect(data.nested.value).toBe('changed');
  });
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  it.each([
    undefined,
    null,
    [],
    { v: undefined },
    { v: NaN },
    { v: Infinity },
    { v: 1n },
    { v: Symbol() },
    { v: () => 1 },
    { v: new Date() },
    cycle,
    { v: new Array(2) },
    { [Symbol()]: 1 },
  ])('rejects non-JSON input %# without sending', async (input) => {
    const sender = vi.fn();
    const tracker = new EventTracker({ projects: { site: { url: URL } }, sender });
    expect(await tracker.track('site', 'event', input as JsonObject)).toEqual({
      status: 'failed',
      reason: 'invalid-data',
    });
    expect(sender).not.toHaveBeenCalled();
  });
  it('does not execute getters or toJSON', async () => {
    const get = vi.fn(() => 'secret');
    const toJSON = vi.fn(() => ({}));
    const tracker = new EventTracker({ projects: { site: { url: URL } } });
    const accessor = Object.defineProperty({}, 'value', { get, enumerable: true });
    expect((await tracker.track('site', 'event', accessor)).status).toBe('failed');
    expect((await tracker.track('site', 'event', { toJSON } as unknown as JsonObject)).status).toBe(
      'failed'
    );
    expect(get).not.toHaveBeenCalled();
    expect(toJSON).not.toHaveBeenCalled();
  });
  it.each([
    () => false,
    () => {
      throw new Error('schema');
    },
  ])('normalizes validator rejection', async (validate) => {
    const sender = vi.fn();
    const tracker = new EventTracker({ projects: { site: { url: URL, validate } }, sender });
    expect(await tracker.track('site', 'event', {})).toEqual({
      status: 'failed',
      reason: 'invalid-data',
    });
    expect(sender).not.toHaveBeenCalled();
  });
  it('runs a project validator against the immutable send snapshot', async () => {
    const validate = vi.fn(
      (event: string, data: JsonObject) => event === 'valid' && data.key === 'value'
    );
    const sender = vi.fn<EventSender>().mockResolvedValue({ httpStatus: 200 });
    const tracker = new EventTracker({ projects: { site: { url: URL, validate } }, sender });
    expect((await tracker.track('site', 'valid', { key: 'value' })).status).toBe('accepted');
    expect(validate).toHaveBeenCalledWith('valid', { key: 'value' });
  });
  it.each([200, 202, 204, 299, 400, 503, 0])('normalizes sender status %s', async (httpStatus) => {
    const tracker = new EventTracker({
      projects: { site: { url: URL } },
      sender: () => Promise.resolve({ httpStatus }),
    });
    const result = await tracker.track('site', 'event', {});
    expect(result.status).toBe(httpStatus >= 200 && httpStatus <= 299 ? 'accepted' : 'failed');
    if (httpStatus === 503)
      expect(result).toEqual({ status: 'failed', reason: 'http-error', httpStatus });
    if (httpStatus === 0) expect(result).toEqual({ status: 'failed', reason: 'network-error' });
  });
  it('normalizes synchronous sender errors', async () => {
    const tracker = new EventTracker({
      projects: { site: { url: URL } },
      sender: () => {
        throw new Error('offline');
      },
    });
    expect(await tracker.track('site', 'event', {})).toEqual({
      status: 'failed',
      reason: 'network-error',
    });
  });
  it('enforces a deadline even when a custom sender ignores cancellation', async () => {
    vi.useFakeTimers();
    try {
      let signal: AbortSignal | undefined;
      const tracker = new EventTracker({
        projects: { site: { url: URL } },
        timeoutMs: 10,
        sender: async (request) => {
          signal = request.signal;
          return new Promise(() => {});
        },
      });
      const result = tracker.track('site', 'event', {});
      await vi.advanceTimersByTimeAsync(10);
      expect(await result).toEqual({ status: 'failed', reason: 'timeout' });
      expect(signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
  it.each(['sync', 'async'])(
    'isolates %s observer errors and notifies exactly once',
    async (mode) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const onResult = vi.fn(() => {
          if (mode === 'sync') throw new Error('observer');
          return Promise.reject(new Error('observer'));
        });
        const tracker = new EventTracker({ projects: { site: { url: null } }, onResult });
        expect(await tracker.track('site', 'event', {})).toEqual({
          status: 'skipped',
          reason: 'unconfigured',
        });
        expect(onResult).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith('Event tracking result observer failed.');
      } finally {
        warn.mockRestore();
      }
    }
  );
  it('awaits each observer without serializing other tracks', async () => {
    let release: (() => void) | undefined;
    const observed: TrackResult[] = [];
    const tracker = new EventTracker({
      projects: { site: { url: URL } },
      sender: () => Promise.resolve({ httpStatus: 202 }),
      onResult: async (attempt, result) => {
        observed.push(result);
        if (attempt.event === 'slow')
          await new Promise<void>((resolve) => {
            release = resolve;
          });
      },
    });
    const slow = tracker.track('site', 'slow', {});
    await expect(tracker.track('site', 'fast', {})).resolves.toEqual({
      status: 'accepted',
      httpStatus: 202,
    });
    expect(observed).toHaveLength(2);
    release?.();
    await slow;
  });
});
