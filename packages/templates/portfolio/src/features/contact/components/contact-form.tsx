'use client';

import { ContactForm } from '@frontend/contact/ui';
import { contactSubmitResultSchema, type ContactSubmit } from '@frontend/contact/contracts';
import { useText, useAppConfig } from '../../../infra/resources/client';
import { CONTACT_ENDPOINT } from '../index';
import { ContactLinks } from './contact-links';

export function ContactContent() {
  const text = useText();
  const config = useAppConfig().get('app');
  const locale = text.locale;
  const label = text.getText('main', 'contact.links');
  const submit: ContactSubmit = async (values, signal) => {
    const query = new URLSearchParams({ locale });
    const response = await fetch(CONTACT_ENDPOINT + '?' + query.toString(), {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const input: unknown = await response.json();
    const result = contactSubmitResultSchema.parse(input);
    if ((result.status === 'accepted') !== response.ok)
      throw new Error('Contact response status did not match its body.');
    return result;
  };
  return (
    <div className="ui-portfolio-contact">
      <ContactForm
        submit={submit}
        text={{
          fields: {
            name: {
              label: text.getText('main', 'contact.form.nameOptional'),
              invalid: text.getText('main', 'contact.form.invalidName'),
            },
            email: {
              label: text.getText('main', 'contact.form.email'),
              invalid: text.getText('main', 'contact.form.invalidEmail'),
            },
            message: {
              label: text.getText('main', 'contact.form.message'),
              invalid: text.getText('main', 'contact.form.invalidMessage'),
            },
          },
          submit: text.getText('main', 'contact.form.submit'),
          pending: text.getText('main', 'contact.form.pending'),
          cancel: text.getText('main', 'contact.form.cancel'),
          accepted: text.getText('main', 'contact.form.accepted'),
          invalid: text.getText('main', 'contact.form.invalid'),
          failures: {
            unavailable: text.getText('main', 'contact.failure.unavailable'),
            timeout: text.getText('main', 'contact.failure.timeout'),
            'delivery-failed': text.getText('main', 'contact.failure.delivery'),
            'rate-limited': text.getText('main', 'contact.failure.rate'),
            'verification-failed': text.getText('main', 'contact.failure.verification'),
          },
        }}
      />
      <ContactLinks links={config.contact?.links ?? []} label={label} />
    </div>
  );
}
