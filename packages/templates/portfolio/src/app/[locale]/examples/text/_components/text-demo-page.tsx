'use client';
import { localeHref } from '../../../../../infra/resources/routing';
import Link from 'next/link';
import { ExampleLanguagePicker } from '../../_components/example-language-picker';
import { TextNavigation } from './text-navigation';
import { useState } from 'react';
import { ResourceScope } from '../../../../../infra/resources/client';
import { useText, useTextLocale, TextProvider } from '../../../../../infra/resources/client';
import { RESOURCE_SCOPES, TEXT_RESOURCE_VERSION } from '../../../../../infra/resources/index';
function TextContent({ mode }: { readonly mode: 'SSR' | 'CSR' }) {
  const text = useText();
  const { selection } = useTextLocale();
  const locale = selection.locale;
  const status = selection.status === 'ready' ? 'ready' : 'switching';
  const [note, setNote] = useState('');
  const [count, setCount] = useState(0);
  return (
    <section
      className="example-sections"
      lang={locale}
      data-testid="text-content"
      data-locale={locale}
    >
      <Link href={localeHref('/', text.locale)}>{text.getText('main', 'textDemo.back')}</Link>
      <TextNavigation />
      <header>
        <h1>{text.getText('demo', 'title')}</h1>
        <p>{text.getText('demo', 'description')}</p>
      </header>
      <section className="example-flow">
        <h2>{text.getText('main', 'textDemo.heading')}</h2>
        <p>{text.getText('demo', 'greeting', { name: 'reader' })}</p>
        <ExampleLanguagePicker />
        <label>
          {text.getText('main', 'textDemo.input')}
          <input
            data-testid="text-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <div className="example-controls">
          <button type="button" className="ui-button" onClick={() => setCount(count + 1)}>
            {text.getText('demo', 'actions.confirm')}
          </button>
          <output data-testid="text-count" aria-label={text.getText('main', 'textDemo.counter')}>
            {count}
          </output>
        </div>
      </section>
      <p role="status" data-testid="text-status">
        {text.getText('main', `textDemo.status.${status === 'switching' ? 'switching' : 'ready'}`)}
      </p>
      <p className="example-code" aria-label={text.getText('main', 'textDemo.resourceState')}>
        {JSON.stringify({
          mode,
          locale,
          namespaces: RESOURCE_SCOPES.textDemo.text,
          version: TEXT_RESOURCE_VERSION,
        })}
      </p>
    </section>
  );
}
export function TextDemoPage({
  mode,
  initialSnapshot,
}: {
  readonly mode: 'SSR' | 'CSR';
  readonly initialSnapshot?: unknown;
}) {
  return (
    <TextProvider scope={RESOURCE_SCOPES.textDemo} initialSnapshot={initialSnapshot}>
      <ResourceScope scope={RESOURCE_SCOPES.textDemo}>
        <TextContent mode={mode} />
      </ResourceScope>
    </TextProvider>
  );
}
