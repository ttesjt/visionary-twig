// @vitest-environment node

import { EmailDeliveryError } from '@frontend/email';
import type { EmailSender } from '@frontend/email';
import {
  CONTACT_LIMITS,
  contactSubmitResultSchema,
  validateContact,
} from '@frontend/contact/contracts';
import { submitContact } from '@frontend/contact/server';
import type { ContactDeliveryOptions } from '@frontend/contact/server';
import { describe, expect, it, vi } from 'vitest';

const values = {
  name: 'Sample Visitor',
  email: 'visitor@example.test',
  message: 'I would like to hear more.',
};
const notification = {
  from: 'site@example.test',
  to: 'owner@example.test',
  text: {
    subject: 'New contact message',
    name: 'Name',
    email: 'Email',
    message: 'Message',
  },
};

function setup(): {
  readonly send: ReturnType<typeof vi.fn<EmailSender['send']>>;
  readonly options: ContactDeliveryOptions;
} {
  const send = vi.fn<EmailSender['send']>().mockResolvedValue({
    status: 'accepted',
    messageId: 'internal-receipt',
  });
  return { send, options: { ...notification, sender: { send } } };
}

describe('contact contracts', () => {
  it('normalizes whitespace and uses stable field identifiers for invalid inputs', () => {
    expect(validateContact({ email: ' visitor@example.test ', message: ' Hello ' })).toEqual({
      ok: true,
      values: { email: 'visitor@example.test', message: 'Hello' },
    });
    expect(
      validateContact({
        name: 'a'.repeat(CONTACT_LIMITS.name + 1),
        email: 'broken',
        message: ' ',
      })
    ).toEqual({ ok: false, fields: ['name', 'email', 'message'] });
    expect(validateContact({ ...values, message: 'a'.repeat(CONTACT_LIMITS.message + 1) })).toEqual(
      {
        ok: false,
        fields: ['message'],
      }
    );
    expect(
      contactSubmitResultSchema.safeParse({ status: 'accepted', messageId: 'private' }).success
    ).toBe(false);
  });
});

describe('contact submission', () => {
  it('sets Reply-To from the visitor and sends one validated plain-text notification', async () => {
    const { send, options } = setup();
    const { signal } = new AbortController();

    await expect(submitContact(values, options, signal)).resolves.toEqual({ status: 'accepted' });
    expect(send).toHaveBeenCalledExactlyOnceWith(
      {
        from: 'site@example.test',
        to: 'owner@example.test',
        replyTo: 'visitor@example.test',
        subject: 'New contact message',
        text: 'Name: Sample Visitor\nEmail: visitor@example.test\n\nMessage:\nI would like to hear more.',
      },
      signal
    );
  });

  it('rejects invalid visitor fields, unexpected headers and invalid configuration before sending', async () => {
    const { send, options } = setup();

    await expect(submitContact({ ...values, email: 'invalid' }, options)).resolves.toEqual({
      status: 'invalid',
      fields: ['email'],
    });
    await expect(
      submitContact({ ...values, to: 'someone@example.test' }, options)
    ).resolves.toEqual({
      status: 'invalid',
      fields: [],
    });
    await expect(
      submitContact(values, {
        ...options,
        text: { ...options.text, subject: 'New contact message\r\nBcc: recipient@example.test' },
      })
    ).rejects.toMatchObject({ code: 'configuration' });
    expect(send).not.toHaveBeenCalled();
  });

  it('honors preflight cancellation and keeps delivery errors intact on the server', async () => {
    const { send, options } = setup();
    const aborted = new AbortController();
    const reason = new Error('Request canceled');
    aborted.abort(reason);
    await expect(submitContact(values, options, aborted.signal)).rejects.toMatchObject({
      code: 'aborted',
      cause: reason,
    });
    expect(send).not.toHaveBeenCalled();

    const error = new EmailDeliveryError('unavailable', { cause: new Error('Provider failure') });
    send.mockRejectedValueOnce(error);
    await expect(submitContact(values, options)).rejects.toBe(error);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
