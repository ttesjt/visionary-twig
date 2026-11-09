import type { EmailMessage } from './message.js';

/** Accepted means handed to the provider; it does not promise inbox delivery. */
export interface EmailReceipt {
  readonly status: 'accepted' | 'delivered';
  readonly messageId?: string;
}
export interface EmailSender {
  send(this: void, message: EmailMessage, signal?: AbortSignal): Promise<EmailReceipt>;
}
export const EMAIL_ERROR_CODES = [
  'invalid-message',
  'configuration',
  'unauthorized',
  'rejected',
  'unavailable',
  'timeout',
  'aborted',
  'invalid-response',
] as const;
export type EmailErrorCode = (typeof EMAIL_ERROR_CODES)[number];
export class EmailDeliveryError extends Error {
  readonly code: EmailErrorCode;
  readonly providerStatus: number | undefined;
  readonly providerCodes: readonly number[];
  constructor(
    code: EmailErrorCode,
    options: ErrorOptions & {
      readonly providerStatus?: number;
      readonly providerCodes?: readonly number[];
    } = {}
  ) {
    super('Email delivery failed: ' + code, options);
    this.name = 'EmailDeliveryError';
    this.code = code;
    this.providerStatus = options.providerStatus;
    this.providerCodes = options.providerCodes ?? [];
  }
}
