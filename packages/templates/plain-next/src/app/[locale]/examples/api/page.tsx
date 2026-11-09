'use client';

import Link from 'next/link';
import { ServerApiExample } from './_components/server-api-example';
import { useState, type FormEvent } from 'react';
import { MAX_TITLE_LENGTH, SLUG_ENDPOINT } from '@/app/api/examples/slug/contract';
import { useText } from '@/infra/resources/client';
import { localeHref } from '@/infra/resources/routing';

const REQUEST_METHOD = 'POST';
const REQUEST_TIMEOUT_MS = 5_000;

type SlugResult =
  { status: 'idle' | 'pending' | 'invalid' | 'failed' } | { status: 'ready'; slug: string };

export default function ApiExamplePage() {
  const text = useText();
  const [result, setResult] = useState<SlugResult>({ status: 'idle' });
  const pending = result.status === 'pending';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = new FormData(event.currentTarget).get('title');
    setResult({ status: 'pending' });
    try {
      const response = await fetch(SLUG_ENDPOINT, {
        method: REQUEST_METHOD,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        setResult({ status: response.status === 422 ? 'invalid' : 'failed' });
        return;
      }
      const data: unknown = await response.json();
      if (data && typeof data === 'object' && 'slug' in data && typeof data.slug === 'string') {
        setResult({ status: 'ready', slug: data.slug });
      } else {
        setResult({ status: 'failed' });
      }
    } catch {
      setResult({ status: 'failed' });
    }
  }

  return (
    <main className="example-page example-sections">
      <header className="example-flow">
        <Link href={localeHref('/', text.locale)}>{text.getText('main', 'examples.back')}</Link>
        <h1 className="example-title">{text.getText('main', 'api.title')}</h1>
        <p className="example-description">{text.getText('main', 'api.description')}</p>
        <code>{[REQUEST_METHOD, SLUG_ENDPOINT].join(' ')}</code>
      </header>
      <form className="example-flow" onSubmit={(event) => void submit(event)}>
        <label htmlFor="slug-title">{text.getText('main', 'api.input')}</label>
        <div className="example-controls">
          <input
            id="slug-title"
            name="title"
            required
            maxLength={MAX_TITLE_LENGTH}
            readOnly={pending}
            onChange={() => setResult({ status: 'idle' })}
          />
          <button type="submit" className="ui-button" disabled={pending}>
            {text.getText('main', 'api.submit')}
          </button>
        </div>
        <output
          htmlFor="slug-title"
          aria-live="polite"
          aria-label={text.getText('main', 'api.result')}
        >
          {result.status === 'pending' && text.getText('main', 'api.pending')}
          {result.status === 'invalid' && text.getText('main', 'api.invalid')}
          {result.status === 'failed' && text.getText('main', 'api.failed')}
          {result.status === 'ready' && <code>{result.slug}</code>}
        </output>
      </form>
      <ServerApiExample />
    </main>
  );
}
