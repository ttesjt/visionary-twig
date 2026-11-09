import type { JsonObject, TrackerOptions } from '@frontend/event-tracking';
export const TRACKING_EVENTS = { sampleOpened: 'sample_opened', custom: 'custom_event' } as const;
export type AppEvents = {
  site: { [TRACKING_EVENTS.sampleOpened]: { itemId: string; source: 'example' } };
  debug: Record<string, JsonObject>;
};

export const trackingOptions = {
  projects: {
    site: { url: process.env.NEXT_PUBLIC_EVENT_TRACKING_URL || null },
    debug: { url: process.env.NEXT_PUBLIC_EVENT_TRACKING_URL || null },
  },
} satisfies TrackerOptions<keyof AppEvents>;
