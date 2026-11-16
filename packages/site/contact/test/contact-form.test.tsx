import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactForm } from '@frontend/contact/ui';
import type { ContactFormText } from '@frontend/contact/ui';
import type { ContactSubmit, ContactSubmitResult } from '@frontend/contact/contracts';
import { describe, expect, it, vi } from 'vitest';

const text: ContactFormText = {
  fields: {
    name: { label: 'Name (optional)', invalid: 'Check your name.' },
    email: { label: 'Email', invalid: 'Enter a valid email address.' },
    message: { label: 'Message', invalid: 'Enter a message.' },
  },
  submit: 'Send',
  pending: 'Sending…',
  cancel: 'Cancel',
  accepted: 'Message accepted.',
  invalid: 'Check the form.',
  failures: {
    unavailable: 'Service unavailable.',
    timeout: 'Request timed out.',
    'delivery-failed': 'Delivery failed.',
    'rate-limited': 'Try again later.',
    'verification-failed': 'Please verify again.',
  },
};

function pendingSubmission(): {
  readonly promise: Promise<ContactSubmitResult>;
  readonly resolve: (value: ContactSubmitResult) => void;
} {
  let resolve = (_value: ContactSubmitResult): void => {
    throw new Error('Pending submission was not initialized.');
  };
  const promise = new Promise<ContactSubmitResult>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function submitButton(): HTMLElement {
  return screen.getByRole('button', { name: text.submit });
}

function formFields(): { readonly email: HTMLElement; readonly message: HTMLElement } {
  return {
    email: screen.getByLabelText(text.fields.email.label),
    message: screen.getByLabelText(text.fields.message.label),
  };
}

async function enterMessage(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const { email, message } = formFields();
  await user.type(email, 'visitor@example.test');
  await user.type(message, 'Hello.');
}

describe('ContactForm', () => {
  it('associates localized errors with their inputs and suppresses invalid submissions', async () => {
    const user = userEvent.setup();
    const submit = vi.fn<ContactSubmit>();
    render(<ContactForm submit={submit} text={text} />);

    await user.click(submitButton());
    const { email, message } = formFields();
    expect(email).toBeInvalid();
    expect(message).toBeInvalid();
    expect(email).toHaveAccessibleDescription(text.fields.email.invalid);
    expect(message).toHaveAccessibleDescription(text.fields.message.invalid);
    expect(screen.getByRole('status')).toHaveTextContent(text.invalid);
    expect(submitButton().closest('form')).toHaveAttribute('method', 'post');
    expect(submit).not.toHaveBeenCalled();

    await user.type(email, 'visitor@example.test');
    expect(email).not.toHaveAttribute('aria-invalid');
    expect(message).toHaveAccessibleDescription(text.fields.message.invalid);
  });

  it('suppresses duplicate in-flight submits, preserves input on failure and clears it on acceptance', async () => {
    const user = userEvent.setup();
    const first = pendingSubmission();
    const submit = vi
      .fn<ContactSubmit>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ status: 'accepted' });
    render(<ContactForm submit={submit} text={text} />);

    await enterMessage(user);
    const form = submitButton().closest('form');
    if (!form) throw new Error('Missing contact form.');
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: text.pending })).toBeDisabled();

    await act(async () => {
      first.resolve({ status: 'failed', code: 'rate-limited' });
      await first.promise;
    });
    const { email, message } = formFields();
    expect(screen.getByRole('status')).toHaveTextContent(text.failures['rate-limited']);
    expect(email).toHaveValue('visitor@example.test');
    expect(message).toHaveValue('Hello.');

    await user.click(submitButton());
    expect(submit).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent(text.accepted);
    expect(email).toHaveValue('');
    expect(message).toHaveValue('');
  });

  it('releases a canceled request, ignores its late result, and aborts pending work on unmount', async () => {
    const user = userEvent.setup();
    const first = pendingSubmission();
    const second = pendingSubmission();
    const submit = vi
      .fn<ContactSubmit>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { unmount } = render(<ContactForm submit={submit} text={text} />);

    await enterMessage(user);
    await user.click(submitButton());
    await user.click(screen.getByRole('button', { name: text.cancel }));
    expect(submit.mock.calls[0]?.[1].aborted).toBe(true);
    expect(formFields().message).toHaveValue('Hello.');

    await user.click(submitButton());
    await act(async () => {
      first.resolve({ status: 'accepted' });
      await first.promise;
    });
    expect(screen.getByRole('status')).toHaveTextContent(text.pending);
    expect(formFields().message).toHaveValue('Hello.');
    unmount();
    expect(submit.mock.calls[1]?.[1].aborted).toBe(true);
  });

  it('shows network failure and lets the visitor retry without retyping', async () => {
    const user = userEvent.setup();
    const submit = vi.fn<ContactSubmit>().mockRejectedValueOnce(new Error('Transport failed.'));
    render(<ContactForm submit={submit} text={text} />);
    await enterMessage(user);
    await user.click(submitButton());
    expect(screen.getByRole('status')).toHaveTextContent(text.failures.unavailable);
    expect(formFields().message).toHaveValue('Hello.');
    expect(submitButton()).toBeEnabled();
  });
});
