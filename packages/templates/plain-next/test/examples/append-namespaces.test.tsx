import { resourcePart } from './resource-part';
import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ResourceRuntimeProvider } from '@frontend/resource-runtime/react';
import { prepareResourcePlan, type ResourceReader } from '@frontend/resource-runtime';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  AppConfigProvider,
  ContentProvider,
  ResourceScope,
  TextProvider,
  useAppConfig,
  useAppendNamespace,
  useContent,
  useText,
  useTextLocale,
} from '../../src/infra/resources/client';
import { RESOURCE_SCOPES as scopes } from '../../src/site/resource-scopes';
import { jsonReader } from '../json-resources';

it('publishes concurrent lazy sections only to the nearest Content provider and keeps them after close', async () => {
  const base = await prepareResourcePlan(resourcePart('content', scopes.layout), jsonReader);
  const demo = await prepareResourcePlan(resourcePart('text', scopes.contentDemo), () =>
    Promise.resolve(
      JSON.parse(
        readFileSync(
          path.resolve(import.meta.dirname, '../../.generated/text/en/demo.json'),
          'utf8'
        )
      ) as unknown
    )
  );
  const transport = vi.fn(jsonReader);
  function Membership({ id }: { readonly id: string }) {
    return <p data-testid={id}>{useContent().namespaces.join('|')}</p>;
  }
  function Sections() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Membership id="inside" />
        <button onClick={() => setOpen(!open)}>toggle</button>
        {open && (
          <>
            <ResourceScope scope={scopes.contentDemo}>
              <p>catalog ready</p>
            </ResourceScope>
            <ResourceScope scope={scopes.makingNotes}>
              <p>notes ready</p>
            </ResourceScope>
          </>
        )}
      </>
    );
  }
  render(
    <ResourceRuntimeProvider reader={transport}>
      <TextProvider scope={scopes.contentDemo} initialSnapshot={demo}>
        <ContentProvider scope={scopes.layout} initialSnapshot={base}>
          <Membership id="outside" />
          <ContentProvider scope={scopes.metadata}>
            <Sections />
          </ContentProvider>
        </ContentProvider>
      </TextProvider>
    </ResourceRuntimeProvider>
  );
  await screen.findByText('catalog ready');
  await screen.findByText('notes ready');
  fireEvent.click(screen.getByText('toggle'));
  expect(screen.getByTestId('inside').textContent?.split('|').sort()).toEqual([
    'base',
    'catalog',
    'making-notes',
  ]);
  expect(screen.getByTestId('outside').textContent).toBe('base');
  fireEvent.click(screen.getByText('toggle'));
  expect(screen.getByText('notes ready')).toBeDefined();
  expect(transport).toHaveBeenCalledTimes(2);
});

it('accepts externally loaded config once and rejects invalid or conflicting values without changing the reader', () => {
  const read = vi.fn<ResourceReader>();
  const value = { version: 1, home: { showIntroduction: true } };
  function Probe() {
    const append = useAppendNamespace();
    const config = useAppConfig();
    const install = (data: unknown) => append({ kind: 'config', namespace: 'app', value: data });
    return (
      <>
        <p>{config.has('app') ? String(config.get('app').home.showIntroduction) : 'empty'}</p>
        <button
          onClick={() => {
            expect(() => install({})).toThrow();
            install(value);
            install({ home: value.home, version: 1 });
            expect(() => install({ ...value, home: { showIntroduction: false } })).toThrow(
              /replace/
            );
          }}
        >
          install
        </button>
      </>
    );
  }
  render(
    <ResourceRuntimeProvider reader={read}>
      <AppConfigProvider scope={scopes.metadata}>
        <Probe />
      </AppConfigProvider>
    </ResourceRuntimeProvider>
  );
  fireEvent.click(screen.getByText('install'));
  expect(screen.getByText('true')).toBeDefined();
  expect(read).not.toHaveBeenCalled();
});

it('keeps a descendant reader valid when a sibling tries to append its namespace to an ancestor', async () => {
  const read = vi.fn<ResourceReader>(jsonReader);
  const local = await prepareResourcePlan(resourcePart('content', scopes.makingNotes), jsonReader);
  function Notes() {
    return <p>{useContent().get('making-notes').entries[0]?.technique}</p>;
  }
  const tree = (child: boolean) => (
    <ResourceRuntimeProvider reader={read}>
      <ContentProvider scope={scopes.metadata}>
        {child && (
          <ContentProvider scope={scopes.makingNotes} initialSnapshot={local}>
            <Notes />
          </ContentProvider>
        )}
        <ResourceScope scope={scopes.makingNotes}>
          <p>installed above</p>
        </ResourceScope>
      </ContentProvider>
    </ResourceRuntimeProvider>
  );
  const { rerender } = render(tree(true));
  await screen.findByRole('alert');
  expect(screen.getByText('Graphite on paper')).toBeDefined();
  rerender(tree(false));
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByText('installed above');
  expect(read).toHaveBeenCalledTimes(1);
});

it('rejects another locale before publishing an externally loaded Text namespace', () => {
  const dictionary: unknown = JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '../../.generated/text/zh/demo.json'), 'utf8')
  );
  function Probe() {
    const append = useAppendNamespace();
    const text = useText();
    return (
      <>
        <button
          onClick={() =>
            expect(() =>
              append({
                kind: 'text',
                namespace: 'demo',
                locale: 'zh',
                value: dictionary,
              })
            ).toThrow(/locale mismatch/)
          }
        >
          append
        </button>
        <output>
          {text.locale}|{String(text.hasText('demo'))}
        </output>
      </>
    );
  }
  render(
    <ResourceRuntimeProvider reader={vi.fn<ResourceReader>()}>
      <TextProvider initialLocale="en" scope={scopes.makingNotes}>
        <Probe />
      </TextProvider>
    </ResourceRuntimeProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'append' }));
  expect(screen.getByText('en|false')).toBeDefined();
});

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

it('replans an in-flight language switch after a lazy Text append, retaining both namespaces after close', async () => {
  const main = deferred();
  const demo = deferred();
  const read = vi.fn<ResourceReader>(async (entry) => {
    if (entry.url.includes('/zh/')) await (entry.id === 'main' ? main.promise : demo.promise);
    return JSON.parse(
      readFileSync(
        path.resolve(
          import.meta.dirname,
          '../../.generated/text',
          entry.url.split('/').slice(-2).join('/')
        ),
        'utf8'
      )
    ) as unknown;
  });
  const initial = await prepareResourcePlan(resourcePart('text', scopes.metadata, 'en'), read);
  function Page() {
    const text = useText(),
      { selectLocale } = useTextLocale();
    const [open, setOpen] = useState(false);
    return (
      <>
        <p>
          {text.getText('main', 'home.title')}
          {text.hasText('demo') && text.getText('demo', 'title')}
        </p>
        <button onClick={() => selectLocale('zh')}>switch</button>
        <button onClick={() => setOpen(!open)}>toggle</button>
        {open && (
          <ResourceScope scope={scopes.textDemo}>
            <p>demo ready</p>
          </ResourceScope>
        )}
      </>
    );
  }
  render(
    <ResourceRuntimeProvider reader={read}>
      <TextProvider scope={scopes.metadata} initialSnapshot={initial}>
        <ResourceScope scope={scopes.metadata}>
          <Page />
        </ResourceScope>
      </TextProvider>
    </ResourceRuntimeProvider>
  );
  fireEvent.click(screen.getByText('switch'));
  fireEvent.click(screen.getByText('toggle'));
  await screen.findByText('demo ready');
  fireEvent.click(screen.getByText('toggle'));
  await waitFor(() =>
    expect(
      read.mock.calls.some(([entry]) => entry.id === 'demo' && entry.url.includes('/zh/'))
    ).toBe(true)
  );
  await act(async () => {
    main.resolve();
    await main.promise;
  });
  expect(screen.getByText('Welcome.Ready to explore.')).toBeDefined();
  await act(async () => {
    demo.resolve();
    await demo.promise;
  });
  expect(screen.getByText('欢迎。准备好探索了。')).toBeDefined();
});
