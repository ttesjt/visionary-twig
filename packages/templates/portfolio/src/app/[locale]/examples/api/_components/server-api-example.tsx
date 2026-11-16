'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  MAX_TOPIC_LENGTH,
  RECOMMENDATION_ENDPOINT,
  recommendationSchema,
  serviceErrorSchema,
  type ServiceError,
} from '@/app/api/examples/recommendation/contract';
import { useText } from '@/infra/resources/client';

const REQUEST_TIMEOUT_MS = 10_000;
type Result =
  | { status: 'idle' | 'pending' }
  | { status: 'ready'; recommendation: string }
  | { status: 'failed'; error: ServiceError | 'request' };

export function ServerApiExample() {
  const text = useText();
  const [result, setResult] = useState<Result>({ status: 'idle' });
  const active = useRef<AbortController | null>(null);
  const pending = result.status === 'pending';
  useEffect(() => () => active.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current) return;
    const topic = new FormData(event.currentTarget).get('topic');
    if (typeof topic !== 'string') return;
    const controller = new AbortController();
    active.current = controller;
    setResult({ status: 'pending' });
    try {
      const response = await fetch(
        RECOMMENDATION_ENDPOINT + '?' + new URLSearchParams({ topic }).toString(),
        {
          cache: 'no-store',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
        }
      );
      const data: unknown = await response.json();
      if (controller.signal.aborted) return;
      if (response.ok) {
        const parsed = recommendationSchema.safeParse(data);
        setResult(
          parsed.success
            ? { status: 'ready', recommendation: parsed.data.recommendation }
            : { status: 'failed', error: 'invalid-response' }
        );
      } else {
        const parsed = serviceErrorSchema.safeParse(data);
        setResult({ status: 'failed', error: parsed.success ? parsed.data.error : 'request' });
      }
    } catch {
      if (!controller.signal.aborted) setResult({ status: 'failed', error: 'request' });
    } finally {
      if (active.current === controller) active.current = null;
    }
  }

  return (
    <section className="example-flow" aria-labelledby="server-api-heading">
      <h2 id="server-api-heading">{text.getText('main', 'bff.title')}</h2>
      <p>{text.getText('main', 'bff.description')}</p>
      <form className="example-flow" onSubmit={(event) => void submit(event)}>
        <label htmlFor="recommendation-topic">{text.getText('main', 'bff.topic')}</label>
        <div className="example-controls">
          <input
            id="recommendation-topic"
            name="topic"
            required
            maxLength={MAX_TOPIC_LENGTH}
            readOnly={pending}
            defaultValue={text.getText('main', 'bff.example')}
            onChange={() => setResult({ status: 'idle' })}
          />
          <button type="submit" className="ui-button" disabled={pending}>
            {text.getText('main', 'bff.submit')}
          </button>
        </div>
        <output aria-live="polite" aria-label={text.getText('main', 'bff.result')}>
          {result.status === 'pending' && text.getText('main', 'bff.pending')}
          {result.status === 'ready' && result.recommendation}
          {result.status === 'failed' && text.getText('main', `bff.error.${result.error}`)}
        </output>
      </form>
    </section>
  );
}
