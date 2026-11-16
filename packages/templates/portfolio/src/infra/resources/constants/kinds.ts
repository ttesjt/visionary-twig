export const RESOURCE_KINDS = ['text', 'config', 'content'] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];
