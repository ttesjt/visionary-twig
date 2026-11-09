import { z } from 'zod';
import { requestCloudflareJson, CloudflareHttpError } from '../http/json.js';
export const TURNSTILE_TOKEN_MAX_CHARACTERS = 2048;
export const TURNSTILE_VERIFY_TIMEOUT_MS = 5_000;
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const responseSchema = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
  action: z.string().optional(),
  'error-codes': z.array(z.string()).optional(),
});
export class CloudflareVerificationError extends Error {
  constructor(
    readonly code: 'configuration' | 'unavailable' | 'invalid-response' | 'timeout' | 'aborted',
    options: ErrorOptions = {}
  ) {
    super('Cloudflare verification failed: ' + code, options);
    this.name = 'CloudflareVerificationError';
  }
}
export interface TurnstileVerifierOptions {
  readonly secretKey: string;
  readonly hostname: string;
  readonly action: string;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
}
export function createTurnstileVerifier(
  options: TurnstileVerifierOptions
): (token: string, signal?: AbortSignal) => Promise<boolean> {
  if (!options.secretKey || !options.hostname || !options.action)
    throw new CloudflareVerificationError('configuration');
  return async (token: string, signal?: AbortSignal): Promise<boolean> => {
    if (!token || token.length > TURNSTILE_TOKEN_MAX_CHARACTERS) return false;
    let response;
    try {
      response = await requestCloudflareJson(
        SITEVERIFY_URL,
        {
          body: { secret: options.secretKey, response: token },
          timeoutMs: options.timeoutMs ?? TURNSTILE_VERIFY_TIMEOUT_MS,
          ...(signal ? { signal } : {}),
        },
        options.fetch
      );
    } catch (cause) {
      const code =
        cause instanceof CloudflareHttpError && cause.code !== 'network'
          ? cause.code
          : 'unavailable';
      throw new CloudflareVerificationError(code, { cause });
    }
    if (response.status < 200 || response.status >= 300)
      throw new CloudflareVerificationError('unavailable');
    const parsed = responseSchema.safeParse(response.data);
    if (!parsed.success) throw new CloudflareVerificationError('invalid-response');
    if (
      parsed.data['error-codes']?.some((code) =>
        ['missing-input-secret', 'invalid-input-secret'].includes(code)
      )
    )
      throw new CloudflareVerificationError('configuration');
    if (parsed.data['error-codes']?.includes('internal-error'))
      throw new CloudflareVerificationError('unavailable');
    return (
      parsed.data.success &&
      parsed.data.hostname === options.hostname &&
      parsed.data.action === options.action
    );
  };
}
