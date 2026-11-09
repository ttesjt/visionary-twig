import { expect, it } from 'vitest';
import { EventTracker } from '../index.js';
import type { JsonObject } from '../index.js';
it('preserves project/event/payload relationships and explicit free projects', () => {
  type Events = {
    site: { opened: { itemId: string }; closed: { reason: string } };
    debug: Record<string, JsonObject>;
  };
  const tracker = new EventTracker<Events>({
    projects: { site: { url: null }, debug: { url: null } },
  });
  void tracker.track('site', 'opened', { itemId: 'sample' });
  void tracker.track('debug', 'custom', { anything: [1, true] });
  // @ts-expect-error Known projects do not fall back to arbitrary events.
  void tracker.track('site', 'typo', {});
  // @ts-expect-error Payload must match the selected event.
  void tracker.track('site', 'opened', { reason: 'wrong' });
  // @ts-expect-error Unknown projects are rejected by TypeScript.
  void tracker.track('other', 'opened', {});
  expect(tracker).toBeInstanceOf(EventTracker);
});

it('accepts nested interface contracts while rejecting non-JSON field types', async () => {
  interface Detail {
    source: string;
  }
  interface Payload {
    itemId: string;
    detail: Detail;
    samples: readonly Detail[];
  }
  interface Events {
    site: { opened: Payload };
  }
  const tracker = new EventTracker<Events>({ projects: { site: { url: null } } });
  await expect(
    tracker.track('site', 'opened', {
      itemId: 'sample',
      detail: { source: 'example' },
      samples: [],
    })
  ).resolves.toEqual({ status: 'skipped', reason: 'unconfigured' });
  // @ts-expect-error Field types retain their event-specific contract.
  void tracker.track('site', 'opened', { itemId: 1 });
  // @ts-expect-error Dates are not JSON payload fields.
  new EventTracker<{ site: { invalid: { date: Date } } }>({ projects: { site: { url: null } } });
  // @ts-expect-error Functions cannot enter event payload contracts.
  new EventTracker<{ site: { invalid: { fn: () => void } } }>({
    projects: { site: { url: null } },
  });
  // @ts-expect-error An event payload must be an object, not an array.
  new EventTracker<{ site: { invalid: string[] } }>({ projects: { site: { url: null } } });
});
