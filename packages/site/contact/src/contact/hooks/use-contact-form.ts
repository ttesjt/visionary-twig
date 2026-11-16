'use client';

import { useEffect, useRef, useState } from 'react';
import { validateContact } from '../contracts.js';
import type { ContactField, ContactSubmit, ContactSubmitResult } from '../contracts.js';

type FormValues = Readonly<Record<ContactField, string>>;
type FormState = { readonly status: 'idle' | 'pending' } | ContactSubmitResult;

interface ContactFormState {
  readonly values: FormValues;
  readonly state: FormState;
  readonly setField: (field: ContactField, value: string) => void;
  readonly submit: () => Promise<void>;
  readonly cancel: () => void;
}

const EMPTY_FIELDS: FormValues = { name: '', email: '', message: '' };

function abortActiveSubmission(active: { current: AbortController | null }): void {
  const request = active.current;
  active.current = null;
  request?.abort();
}

export function useContactForm(submitContact: ContactSubmit): ContactFormState {
  const [values, setValues] = useState<FormValues>(EMPTY_FIELDS);
  const [state, setState] = useState<FormState>({ status: 'idle' });
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => abortActiveSubmission(active), []);

  function setField(field: ContactField, value: string): void {
    if (active.current) return;
    setValues((previous) => ({ ...previous, [field]: value }));
    setState((current) => {
      if (current.status !== 'invalid') return { status: 'idle' };
      const fields = current.fields.filter((key) => key !== field);
      return fields.length > 0 ? { status: 'invalid', fields } : { status: 'idle' };
    });
  }

  async function submit(): Promise<void> {
    if (active.current) return;
    const parsed = validateContact(values);
    if (!parsed.ok) {
      setState({ status: 'invalid', fields: parsed.fields });
      return;
    }

    const request = new AbortController();
    active.current = request;
    setState({ status: 'pending' });
    try {
      const result = await submitContact(parsed.values, request.signal);
      if (active.current !== request) return;
      setState(result);
      if (result.status === 'accepted') setValues(EMPTY_FIELDS);
    } catch {
      if (active.current === request) setState({ status: 'failed', code: 'unavailable' });
    } finally {
      if (active.current === request) active.current = null;
    }
  }

  function cancel(): void {
    abortActiveSubmission(active);
    setState({ status: 'idle' });
  }

  return { values, state, setField, submit, cancel };
}
