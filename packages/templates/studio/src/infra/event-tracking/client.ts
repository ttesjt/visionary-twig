'use client';
import { useLayoutEffect } from 'react';
import { EventTracker } from '@frontend/event-tracking';
import { trackingOptions, type AppEvents } from '../../site/tracking-events';
import { useTrackingPermission } from '../../site/tracking-permission';
import { useAppConfig } from '../resources/client';

/**
 * Tracking starts disabled.
 * Interaction data could help improve the site experience, but before enabling it,
 * make sure to check the requirements in each deployment region and
 * implement any required notices and consent controls.
 * To opt in, set `tracking.enabled` to `true` in the `app` config.
 */
const tracker = new EventTracker<AppEvents>({ ...trackingOptions, enabled: false });
export const eventTracker: Pick<typeof tracker, 'track'> = tracker;

export function TrackingInitialization() {
  const siteEnabled = useAppConfig().get('app').tracking?.enabled === true;
  const permitted = useTrackingPermission();
  const enabled = siteEnabled && permitted;
  useLayoutEffect(() => {
    tracker.setEnabled(enabled);
    return () => tracker.setEnabled(false);
  }, [enabled]);
  return null;
}
