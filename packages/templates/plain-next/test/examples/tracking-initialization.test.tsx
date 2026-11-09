import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { render } from '@testing-library/react';
import { afterAll, afterEach, expect, it, vi } from 'vitest';
import { prepareResourcePlan, type ResourceSnapshot } from '@frontend/resource-runtime';
import { ResourceRuntimeProvider } from '@frontend/resource-runtime/react';
import { AppConfigProvider } from '../../src/infra/resources/client';
import { eventTracker, TrackingInitialization } from '../../src/infra/event-tracking/client';
import { RESOURCE_SCOPES } from '../../src/site/resource-scopes';
import { TRACKING_EVENTS } from '../../src/site/tracking-events';
import { useTrackingPermission } from '../../src/site/tracking-permission';
import { resourcePart } from './resource-part';

vi.hoisted(() =>
  vi.stubEnv('NEXT_PUBLIC_EVENT_TRACKING_URL', 'https://events.example.test/capture')
);
vi.mock('../../src/site/tracking-permission', () => ({ useTrackingPermission: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());
afterAll(() => vi.unstubAllEnvs());

const scope = RESOURCE_SCOPES.layout;
const plan = resourcePart('config', scope);
function snapshot(enabled?: boolean) {
  return prepareResourcePlan(plan, () =>
    Promise.resolve({
      version: 1,
      home: { showIntroduction: true },
      ...(enabled === undefined ? {} : { tracking: { enabled } }),
    })
  );
}
function owner(config: ResourceSnapshot) {
  return (
    <StrictMode>
      <ResourceRuntimeProvider reader={vi.fn()}>
        <AppConfigProvider scope={scope} initialSnapshot={config}>
          <TrackingInitialization />
        </AppConfigProvider>
      </ResourceRuntimeProvider>
    </StrictMode>
  );
}
const track = () =>
  eventTracker.track('site', TRACKING_EVENTS.sampleOpened, { itemId: 'sample', source: 'example' });

it('enables delivery only after both gates open and closes it again on revocation or teardown', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', fetch);
  const [legacy, off, on] = await Promise.all([snapshot(), snapshot(false), snapshot(true)]);
  const disabled = { status: 'skipped', reason: 'disabled' };
  const accepted = { status: 'accepted', httpStatus: 202 };

  vi.mocked(useTrackingPermission).mockReturnValue(true);
  renderToString(owner(on));
  expect(await track()).toEqual(disabled);

  const ui = render(owner(legacy));
  expect(await track()).toEqual(disabled);
  ui.rerender(owner(off));
  expect(await track()).toEqual(disabled);

  vi.mocked(useTrackingPermission).mockReturnValue(false);
  ui.rerender(owner(on));
  expect(await track()).toEqual(disabled);
  expect(fetch).not.toHaveBeenCalled();

  vi.mocked(useTrackingPermission).mockReturnValue(true);
  ui.rerender(owner(on));
  expect(await track()).toEqual(accepted);
  vi.mocked(useTrackingPermission).mockReturnValue(false);
  ui.rerender(owner(on));
  expect(await track()).toEqual(disabled);

  vi.mocked(useTrackingPermission).mockReturnValue(true);
  ui.rerender(owner(on));
  expect(await track()).toEqual(accepted);
  ui.rerender(owner(off));
  expect(await track()).toEqual(disabled);
  ui.rerender(owner(on));
  ui.unmount();
  expect(await track()).toEqual(disabled);
  expect(fetch).toHaveBeenCalledTimes(2);
});
