import { describe, expect, it } from 'vitest';
import { emailMessageSchema } from './message.js';
const message = {
  from: 'website@example.test',
  to: 'owner@example.test',
  replyTo: 'visitor@example.test',
  subject: 'A new message',
  text: 'Hello.\nThis is a plain-text message.',
};
describe('neutral email message boundary', () => {
  it('accepts plain text without rewriting the message or adding destinations', () => {
    expect(emailMessageSchema.parse(message)).toEqual(message);
  });
  it.each([
    { ...message, from: 'visitor@example.test\r\nBcc: elsewhere@example.test' },
    { ...message, subject: 'Hello\nAnother header' },
    { ...message, replyTo: 'not an email' },
    { ...message, to: ['owner@example.test', 'another@example.test'] },
    { ...message, bcc: 'elsewhere@example.test' },
    { ...message, text: '' },
  ])('rejects unsupported or unsafe messages', (input) => {
    expect(emailMessageSchema.safeParse(input).success).toBe(false);
  });
});
