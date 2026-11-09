import { resourcePart } from './resource-part';
import { StrictMode, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { prepareResourcePlan, type ResourceReader } from '@frontend/resource-runtime';
import { ResourceLayout } from '../../src/infra/resources/client';
import { ResourceScope } from '../../src/infra/resources/client';
import { useText, useTextLocale } from '../../src/infra/resources/client';
import { RESOURCE_SCOPES } from '../../src/infra/resources/index';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { jsonReader, jsonSnapshots } from '../json-resources';
import { ContentProvider, useContent, useAppConfig } from '../../src/infra/resources/client';
const rootJsonSnapshots = () =>
  jsonSnapshots(
    resourcePart('config', RESOURCE_SCOPES.layout),
    resourcePart('content', RESOURCE_SCOPES.layout)
  );

const read: ResourceReader = (resource, signal) =>
  resource.id.includes(':')
    ? jsonReader(resource, signal)
    : Promise.resolve(
        JSON.parse(
          readFileSync(
            path.resolve(
              import.meta.dirname,
              '../../.generated/text',
              resource.url.split('/').slice(-2).join('/')
            ),
            'utf8'
          )
        ) as unknown
      );
const textSnapshot = () =>
  prepareResourcePlan(resourcePart('text', RESOURCE_SCOPES.layout, 'en'), read);
function RootValues() {
  return (
    <p data-testid="root">
      {useText().getText('main', 'home.title')}|
      {String(useAppConfig().get('app').home.showIntroduction)}|
      {useContent().get('base').collection}
    </p>
  );
}
function Notes() {
  const content = useContent();
  return (
    <p data-testid="local">
      {content.get('base').collection}|{content.get('making-notes').entries[0]?.technique}
    </p>
  );
}
function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
describe('JSON resource scopes', () => {
  it('hands complete root/page SSR snapshots to immutable readers without HTTP hydration reads', async () => {
    const [text, json, notes] = await Promise.all([
      textSnapshot(),
      rootJsonSnapshots(),
      prepareResourcePlan(resourcePart('content', RESOURCE_SCOPES.makingNotes), read),
    ]);
    const transport = vi.fn<ResourceReader>();
    const tree = (
      <ResourceLayout initialSnapshots={{ text, ...json }} reader={transport}>
        <RootValues />
        <ContentProvider scope={RESOURCE_SCOPES.makingNotes} initialSnapshot={notes}>
          <ResourceScope scope={RESOURCE_SCOPES.makingNotes}>
            <Notes />
          </ResourceScope>
        </ContentProvider>
      </ResourceLayout>
    );
    expect(renderToString(tree)).toContain('Graphite on paper');
    render(<StrictMode>{tree}</StrictMode>);
    expect(screen.getByTestId('root').textContent).toBe('Welcome.|true|Field Notes');
    expect(screen.getByTestId('local').textContent).toBe('Field Notes|Graphite on paper');
    expect(screen.queryByRole('status')).toBeNull();
    expect(transport).not.toHaveBeenCalled();
  });
  it('starts all three required kinds before resolving any of them and gates incomplete visuals', async () => {
    const hold = deferred();
    const transport = vi.fn<ResourceReader>(async (entry, signal) => {
      await hold.promise;
      return read(entry, signal);
    });
    render(
      <ResourceLayout reader={transport}>
        <RootValues />
      </ResourceLayout>
    );
    await waitFor(() =>
      expect(
        new Set(transport.mock.calls.map(([r]) => (r.id.includes(':') ? r.source : 'text')))
      ).toEqual(new Set(['text', 'config', 'content']))
    );
    expect(screen.queryByTestId('root')).toBeNull();
    await act(async () => {
      hold.resolve();
      await hold.promise;
    });
    await screen.findByTestId('root');
    expect(transport).toHaveBeenCalledTimes(3);
  });
  it('recovers pure CSR page resources, deduplicates siblings, and keeps parent scope isolated', async () => {
    const [text, json] = await Promise.all([textSnapshot(), rootJsonSnapshots()]);
    const hold = deferred();
    const transport = vi.fn<ResourceReader>(async (entry, signal) => {
      await hold.promise;
      return read(entry, signal);
    });
    function Parent() {
      expect(useContent().has('making-notes')).toBe(false);
      return <RootValues />;
    }
    render(
      <ResourceLayout initialSnapshots={{ text, ...json }} reader={transport}>
        <Parent />
        {[1, 2].map((id) => (
          <ContentProvider key={id} scope={RESOURCE_SCOPES.makingNotes}>
            <ResourceScope scope={RESOURCE_SCOPES.makingNotes}>
              <Notes />
            </ResourceScope>
          </ContentProvider>
        ))}
      </ResourceLayout>
    );
    expect(screen.getByTestId('root')).toBeDefined();
    expect(screen.queryByTestId('local')).toBeNull();
    await act(async () => {
      hold.resolve();
      await hold.promise;
    });
    await waitFor(() => expect(screen.getAllByTestId('local')).toHaveLength(2));
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('keeps JSON readers and data through an atomic Text language switch', async () => {
    const [text, json, notes] = await Promise.all([
      textSnapshot(),
      rootJsonSnapshots(),
      prepareResourcePlan(resourcePart('content', RESOURCE_SCOPES.makingNotes), read),
    ]);
    const readers: ReturnType<typeof useContent>[] = [];
    function Switch() {
      readers.push(useContent());
      const { selectLocale } = useTextLocale();
      return (
        <>
          <RootValues />
          <button onClick={() => selectLocale('zh')}>switch</button>
        </>
      );
    }
    const transport = vi.fn<ResourceReader>(read);
    render(
      <ResourceLayout initialSnapshots={{ text, ...json }} reader={transport}>
        <ContentProvider scope={RESOURCE_SCOPES.makingNotes} initialSnapshot={notes}>
          <ResourceScope scope={RESOURCE_SCOPES.makingNotes}>
            <Switch />
            <Notes />
          </ResourceScope>
        </ContentProvider>
      </ResourceLayout>
    );
    fireEvent.click(screen.getByRole('button', { name: 'switch' }));
    await waitFor(() =>
      expect(screen.getByTestId('root').textContent).toBe('欢迎。|true|Field Notes')
    );
    expect(transport.mock.calls.every(([r]) => !r.id.includes(':'))).toBe(true);
    expect(new Set(readers).size).toBe(1);
  });
  it('does not publish a detached scope after its pending request completes', async () => {
    const [text, json] = await Promise.all([textSnapshot(), rootJsonSnapshots()]);
    const hold = deferred();
    const transport = vi.fn<ResourceReader>(async (entry, signal) => {
      await hold.promise;
      return read(entry, signal);
    });
    function Toggle() {
      const [show, setShow] = useState(true);
      return (
        <>
          <button onClick={() => setShow(false)}>hide</button>
          {show && (
            <ContentProvider scope={RESOURCE_SCOPES.makingNotes}>
              <ResourceScope scope={RESOURCE_SCOPES.makingNotes}>
                <Notes />
              </ResourceScope>
            </ContentProvider>
          )}
        </>
      );
    }
    render(
      <ResourceLayout initialSnapshots={{ text, ...json }} reader={transport}>
        <RootValues />
        <Toggle />
      </ResourceLayout>
    );
    await waitFor(() => expect(transport).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'hide' }));
    await act(async () => {
      hold.resolve();
      await hold.promise;
    });
    expect(screen.queryByTestId('local')).toBeNull();
    expect(screen.getByTestId('root')).toBeDefined();
  });
  it('rejects foreign source/schema snapshots before dependent content renders', async () => {
    const [text, json] = await Promise.all([textSnapshot(), rootJsonSnapshots()]);
    const wrong = {
      ...json,
      config: {
        ...json.config,
        resources: json.config.resources.map((entry) => ({ ...entry, source: 'content' })),
      },
    };
    expect(() =>
      renderToString(
        <ResourceLayout initialSnapshots={{ text, ...wrong }}>
          <RootValues />
        </ResourceLayout>
      )
    ).toThrow();
    const invalid = {
      ...json,
      config: {
        ...json.config,
        resources: json.config.resources.map((entry) => ({
          ...entry,
          value: { home: { showIntroduction: 'yes' } },
        })),
      },
    };
    expect(() =>
      renderToString(
        <ResourceLayout initialSnapshots={{ text, ...invalid }}>
          <RootValues />
        </ResourceLayout>
      )
    ).toThrow();
  });
});

it('reuses prepared page props in the private cache after the page scope remounts', async () => {
  const [text, json, notes] = await Promise.all([
    textSnapshot(),
    rootJsonSnapshots(),
    prepareResourcePlan(resourcePart('content', RESOURCE_SCOPES.makingNotes), read),
  ]);
  const transport = vi.fn<ResourceReader>();
  function Tree({ show, prepared }: { readonly show: boolean; readonly prepared: boolean }) {
    return (
      <ResourceLayout initialSnapshots={{ text, ...json }} reader={transport}>
        <RootValues />
        {show && (
          <ContentProvider
            scope={RESOURCE_SCOPES.makingNotes}
            initialSnapshot={prepared ? notes : undefined}
          >
            <ResourceScope scope={RESOURCE_SCOPES.makingNotes}>
              <Notes />
            </ResourceScope>
          </ContentProvider>
        )}
      </ResourceLayout>
    );
  }
  const { rerender } = render(<Tree show prepared />);
  expect(screen.getByTestId('local')).toBeDefined();
  rerender(<Tree show prepared={false} />);
  expect(screen.getByTestId('local')).toBeDefined();
  expect(screen.queryByRole('status')).toBeNull();
  rerender(<Tree show={false} prepared={false} />);
  rerender(<Tree show prepared={false} />);
  expect(screen.getByTestId('local')).toBeDefined();
  expect(screen.queryByRole('status')).toBeNull();
  expect(transport).not.toHaveBeenCalled();
});
