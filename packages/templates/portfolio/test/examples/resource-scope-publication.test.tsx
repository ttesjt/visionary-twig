import { resourcePart } from './resource-part';
import { Component, useState, type ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { prepareResourcePlan, type ResourceReader } from '@frontend/resource-runtime';
import { ResourceRuntimeProvider } from '@frontend/resource-runtime/react';
import { TextProvider, useText } from '../../src/infra/resources/client';
import {
  AppConfigProvider,
  ContentProvider,
  useAppConfig,
  useContent,
} from '../../src/infra/resources/client';
import { RESOURCE_SCOPES } from '../../src/site/resource-scopes';
import { ResourceScope } from '../../src/infra/resources/client';
import { jsonReader } from '../json-resources';

const read: ResourceReader = (entry, signal) =>
  entry.id.includes(':')
    ? jsonReader(entry, signal)
    : Promise.resolve(
        JSON.parse(
          readFileSync(
            path.resolve(
              import.meta.dirname,
              '../../.generated/text',
              entry.url.split('/').slice(-2).join('/')
            ),
            'utf8'
          )
        ) as unknown
      );
it('keeps publication failures local and retries downloaded readers without partially committing earlier kinds', async () => {
  const base = await prepareResourcePlan(resourcePart('content', RESOURCE_SCOPES.layout), read);
  const transport = vi.fn<ResourceReader>(read);
  const outsideError = vi.fn();
  class OuterBoundary extends Component<{ readonly children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() {
      return { failed: true };
    }
    componentDidCatch(error: unknown) {
      outsideError(error);
    }
    render() {
      return this.state.failed ? <p>outer failure</p> : this.props.children;
    }
  }
  function PublicationState() {
    const text = useText();
    const config = useAppConfig();
    return (
      <div data-testid="publication">{[text.hasText('main'), config.has('app')].join(',')}</div>
    );
  }
  function Region() {
    return (
      <p>
        {useText().getText('main', 'home.title')}|
        {String(useAppConfig().get('app').home.showIntroduction)}|
        {useContent().get('base').collection}
      </p>
    );
  }
  function Parent() {
    const [conflict, setConflict] = useState(true);
    const [count, setCount] = useState(0);
    return (
      <ContentProvider
        scope={conflict ? RESOURCE_SCOPES.layout : RESOURCE_SCOPES.metadata}
        initialSnapshot={conflict ? base : undefined}
      >
        <p>surrounding interface</p>
        <button onClick={() => setCount(count + 1)}>count {count}</button>
        <button onClick={() => setConflict(false)}>remove collision</button>
        <TextProvider scope={RESOURCE_SCOPES.makingNotes}>
          <AppConfigProvider scope={RESOURCE_SCOPES.metadata}>
            <ContentProvider scope={RESOURCE_SCOPES.layout}>
              <PublicationState />
              <ResourceScope scope={RESOURCE_SCOPES.layout}>
                <Region />
              </ResourceScope>
            </ContentProvider>
          </AppConfigProvider>
        </TextProvider>
      </ContentProvider>
    );
  }
  render(
    <OuterBoundary>
      <ResourceRuntimeProvider reader={transport}>
        <Parent />
      </ResourceRuntimeProvider>
    </OuterBoundary>
  );
  fireEvent.click(screen.getByRole('button', { name: 'count 0' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('invalid-data');
  expect(screen.getByRole('button', { name: 'count 1' })).toBeDefined();
  expect(screen.getByTestId('publication')).toHaveTextContent('false,false');
  expect(screen.queryByRole('status')).toBeNull();
  const downloads = transport.mock.calls.length;
  expect(downloads).toBe(3);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('invalid-data');
  expect(screen.getByTestId('publication')).toHaveTextContent('false,false');
  expect(transport).toHaveBeenCalledTimes(downloads);
  fireEvent.click(screen.getByRole('button', { name: 'remove collision' }));
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByText('Welcome.|true|Field Notes');
  expect(screen.getByTestId('publication')).toHaveTextContent('true,true');
  expect(screen.getByRole('button', { name: 'count 1' })).toBeDefined();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(transport).toHaveBeenCalledTimes(downloads);
  expect(outsideError).not.toHaveBeenCalled();
});
