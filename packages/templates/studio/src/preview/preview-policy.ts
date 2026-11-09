import { DEFAULT_CONTENT_LIMITS } from '@frontend/ui-document';
export const PREVIEW_TTL_MS = 5 * 60 * 1000;
export const MAX_PREVIEW_ENTRIES = 32;
export const MAX_PREVIEW_REQUEST_BYTES = 2 * DEFAULT_CONTENT_LIMITS.maxBytes + 1024;
export const PREVIEW_BODY_TIMEOUT_MS = 10_000;
export const PREVIEW_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
