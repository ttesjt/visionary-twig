export const TRACKING_EVENTS = { previewAccepted: 'preview_snapshot_accepted' } as const;
export type AppEvents = { studio: { [TRACKING_EVENTS.previewAccepted]: { status: 'accepted' } } };
