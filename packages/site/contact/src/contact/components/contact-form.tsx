'use client';

import { useId } from 'react';
import type { ReactElement } from 'react';
import { CONTACT_FIELDS, CONTACT_LIMITS } from '../contracts.js';
import type { ContactFailureCode, ContactField, ContactSubmit } from '../contracts.js';
import { useContactForm } from '../hooks/use-contact-form.js';

export interface ContactFormText {
  readonly fields: Readonly<
    Record<ContactField, { readonly label: string; readonly invalid: string }>
  >;
  readonly submit: string;
  readonly pending: string;
  readonly cancel: string;
  readonly accepted: string;
  readonly invalid: string;
  readonly failures: Readonly<Record<ContactFailureCode, string>>;
}

export interface ContactFormProps {
  readonly text: ContactFormText;
  readonly submit: ContactSubmit;
}

export function ContactForm({ text, submit }: ContactFormProps): ReactElement {
  const id = useId();
  const form = useContactForm(submit);
  const { state } = form;
  const pending = state.status === 'pending';
  const feedback =
    state.status === 'failed'
      ? text.failures[state.code]
      : state.status === 'idle'
        ? ''
        : text[state.status];

  return (
    <form
      className="ui-contact-form"
      method="post"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.submit();
      }}
    >
      <fieldset className="ui-contact-form-fields" disabled={pending}>
        {CONTACT_FIELDS.map((field) => {
          const fieldId = id + '-' + field;
          const errorId = fieldId + '-error';
          const invalid = state.status === 'invalid' && state.fields.includes(field);
          const bindings = {
            id: fieldId,
            name: field,
            required: field !== 'name',
            value: form.values[field],
            maxLength: CONTACT_LIMITS[field],
            'aria-invalid': invalid || undefined,
            'aria-describedby': invalid ? errorId : undefined,
          };
          return (
            <div className="ui-contact-field" key={field}>
              <label htmlFor={fieldId}>{text.fields[field].label}</label>
              {field === 'message' ? (
                <textarea
                  {...bindings}
                  onChange={(event) => form.setField(field, event.target.value)}
                />
              ) : (
                <input
                  {...bindings}
                  type={field === 'email' ? 'email' : 'text'}
                  autoComplete={field}
                  onChange={(event) => form.setField(field, event.target.value)}
                />
              )}
              {invalid && (
                <p id={errorId} className="ui-contact-error">
                  {text.fields[field].invalid}
                </p>
              )}
            </div>
          );
        })}
        <button className="ui-contact-submit" type="submit">
          {pending ? text.pending : text.submit}
        </button>
      </fieldset>
      {pending && (
        <button className="ui-contact-cancel" type="button" onClick={form.cancel}>
          {text.cancel}
        </button>
      )}
      <p className="ui-contact-status" role="status">
        {feedback}
      </p>
    </form>
  );
}
