import 'server-only';
import { EventTracker } from '@frontend/event-tracking';
import { jsonDefinition } from '../infra/resources';
import { readGeneratedJsonURL } from '../infra/resources/server';
import { appConfigSchema } from './config-schema';
import { TRACKING_EVENTS, type AppEvents } from './preview-events';
import { PREVIEW_TRACKING_HEADER, PREVIEW_TRACKING_GRANTED } from '../preview/tracking-signal';
import { hasPreviewTrackingPermission } from './preview-tracking-permission.server';

export async function trackAcceptedPreview(request: Request): Promise<void> {
  const url = process.env.EVENT_TRACKING_URL;
  if (!url || request.headers.get(PREVIEW_TRACKING_HEADER) !== PREVIEW_TRACKING_GRANTED) return;
  try {
    const configuration = appConfigSchema.parse(
      await readGeneratedJsonURL(jsonDefinition('config', 'app').url)
    );
    if (!configuration.tracking?.enabled || !(await hasPreviewTrackingPermission(request))) return;
    const tracker = new EventTracker<AppEvents>({ projects: { studio: { url } } });
    await tracker.track('studio', TRACKING_EVENTS.previewAccepted, { status: 'accepted' });
  } catch {
    // The preview has already been saved. Keep endpoint URLs, credentials and request data out of logs.
    console.warn('Studio skipped preview tracking because the tracking setup failed.');
  }
}
