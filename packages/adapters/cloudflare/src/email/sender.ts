import { z } from 'zod';
import { emailMessageSchema, EmailDeliveryError, type EmailSender } from '@frontend/email';
import { requestCloudflareJson, CloudflareHttpError } from '../http/json.js';
export const CLOUDFLARE_EMAIL_TIMEOUT_MS = 10_000;
const configurationSchema = z.strictObject({
  accountId: z.string().regex(/^[a-f0-9]{32}$/),
  apiToken: z
    .string()
    .min(1)
    .refine((value) => !/\s/.test(value)),
});
const responseSchema = z.object({
  success: z.boolean(),
  errors: z.array(z.object({ code: z.number() })).optional(),
  result: z
    .object({
      delivered: z.array(z.string()),
      queued: z.array(z.string()),
      permanent_bounces: z.array(z.string()),
      suppressed_recipients: z.array(z.string()).optional(),
      message_id: z.string().optional(),
    })
    .nullable()
    .optional(),
});
export interface CloudflareEmailOptions {
  readonly accountId: string;
  readonly apiToken: string;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
}
export function createCloudflareEmailSender(options: CloudflareEmailOptions): EmailSender {
  const configuration = configurationSchema.safeParse({
    accountId: options.accountId,
    apiToken: options.apiToken,
  });
  if (!configuration.success) throw new EmailDeliveryError('configuration');
  const url = `https://api.cloudflare.com/client/v4/accounts/${configuration.data.accountId}/email/sending/send`;
  return {
    async send(input, signal) {
      const parsed = emailMessageSchema.safeParse(input);
      if (!parsed.success) throw new EmailDeliveryError('invalid-message');
      const message = parsed.data;
      let response;
      try {
        response = await requestCloudflareJson(
          url,
          {
            body: {
              from: message.from,
              to: [message.to],
              subject: message.subject,
              text: message.text,
              ...(message.replyTo ? { reply_to: message.replyTo } : {}),
            },
            headers: { Authorization: 'Bearer ' + configuration.data.apiToken },
            timeoutMs: options.timeoutMs ?? CLOUDFLARE_EMAIL_TIMEOUT_MS,
            ...(signal ? { signal } : {}),
          },
          options.fetch
        );
      } catch (cause) {
        const code =
          cause instanceof CloudflareHttpError
            ? cause.code === 'network'
              ? 'unavailable'
              : cause.code
            : 'unavailable';
        throw new EmailDeliveryError(code, { cause });
      }
      const payload = responseSchema.safeParse(response.data);
      const errorOptions = {
        providerStatus: response.status,
        providerCodes: payload.success ? (payload.data.errors?.map(({ code }) => code) ?? []) : [],
      };
      if (response.status === 401 || response.status === 403)
        throw new EmailDeliveryError('unauthorized', errorOptions);
      if (response.status === 429 || response.status >= 500)
        throw new EmailDeliveryError('unavailable', errorOptions);
      if (response.status < 200 || response.status >= 300)
        throw new EmailDeliveryError('rejected', errorOptions);
      if (!payload.success) throw new EmailDeliveryError('invalid-response', errorOptions);
      const result = payload.data.result;
      if (!payload.data.success || payload.data.errors?.length || !result)
        throw new EmailDeliveryError('rejected', errorOptions);
      if (
        result.permanent_bounces.includes(message.to) ||
        result.suppressed_recipients?.includes(message.to)
      )
        throw new EmailDeliveryError('rejected', errorOptions);
      const status = result.delivered.includes(message.to)
        ? 'delivered'
        : result.queued.includes(message.to)
          ? 'accepted'
          : undefined;
      if (!status) throw new EmailDeliveryError('invalid-response', errorOptions);
      return { status, ...(result.message_id ? { messageId: result.message_id } : {}) };
    },
  };
}
