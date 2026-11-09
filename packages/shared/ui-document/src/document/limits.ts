export interface ContentLimits {
  readonly maxBytes: number;
  readonly maxJsonDepth: number;
  readonly maxValues: number;
  readonly maxNodes: number;
  readonly maxNodeDepth: number;
  readonly maxBindings: number;
  readonly maxPathSegments: number;
}

export const DEFAULT_CONTENT_LIMITS: ContentLimits = Object.freeze({
  maxBytes: 2 * 1024 * 1024,
  maxJsonDepth: 128,
  maxValues: 100_000,
  maxNodes: 10_000,
  maxNodeDepth: 32,
  maxBindings: 10_000,
  maxPathSegments: 64,
});

// The JSON snapshot uses bounded recursion. Hosts may tune limits within its safe ceiling.
const MAX_SUPPORTED_JSON_DEPTH = 512;

export function contentLimits(overrides: Partial<ContentLimits> = {}): ContentLimits {
  const limits = { ...DEFAULT_CONTENT_LIMITS, ...overrides };
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new RangeError(`${key} must be a positive safe integer.`);
    }
  }
  if (limits.maxJsonDepth > MAX_SUPPORTED_JSON_DEPTH) {
    throw new RangeError(`maxJsonDepth must not exceed ${MAX_SUPPORTED_JSON_DEPTH}.`);
  }
  return limits;
}
