import type { JsonObject, TrackerOptions } from '@frontend/event-tracking';
export type AppEvents = { site: Record<string, JsonObject> };
export const trackingOptions = {
  projects: { site: { url: process.env.NEXT_PUBLIC_EVENT_TRACKING_URL || null } },
} satisfies TrackerOptions<keyof AppEvents>;
