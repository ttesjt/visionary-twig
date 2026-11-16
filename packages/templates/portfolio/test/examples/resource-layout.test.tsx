import { resourcePart } from './resource-part';
import { StrictMode, useLayoutEffect, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  prepareResourcePlan,
  restoreResourceSnapshot,
  type ResourceReader,
} from '@frontend/resource-runtime';
import { ResourceLayout as ActualResourceLayout } from '../../src/infra/resources/client';
import { jsonSnapshots } from '../json-resources';
const initialJsonSnapshots = await jsonSnapshots(
  resourcePart('config', RESOURCE_SCOPES.layout),
  resourcePart('content', RESOURCE_SCOPES.layout)
);
function ResourceLayout(
  props: Omit<React.ComponentProps<typeof ActualResourceLayout>, 'initialSnapshots'> & {
    readonly initialSnapshot?: import('@frontend/resource-runtime').ResourceSnapshot;
  }
) {
  const { initialSnapshot, ...rest } = props;
  return (
    <ActualResourceLayout
      {...rest}
      initialSnapshots={{
        ...initialJsonSnapshots,
        ...(initialSnapshot ? { text: initialSnapshot } : {}),
      }}
    />
  );
}
import { ResourceScope } from '../../src/infra/resources/client';
import { ResourceRuntimeProvider } from '@frontend/resource-runtime/react';
import {
  TextProvider,
  useTextScope,
  useTextLocale,
  useText,
} from '../../src/infra/resources/text/client';
import {
  RESOURCE_SCOPES,
  type TextLocale,
  type ResourceScopeDefinition,
} from '../../src/infra/resources/index';
const reader: ResourceReader = (resource) =>
  Promise.resolve(
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
function snapshot(locale: TextLocale, scope: ResourceScopeDefinition) {
  return prepareResourcePlan(resourcePart('text', scope, locale), reader);
}
function deferred() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function Shell({ location }: { readonly location: string }) {
  const text = useText();
  return <p data-testid={location}>{text.getText('main', 'home.title')}</p>;
}
function Page() {
  const text = useText();
  const { selectLocale } = useTextLocale();
  const [count, setCount] = useState(0);
  return (
    <>
      <p data-testid="page-title">{text.getText('demo', 'title')}</p>
      <button onClick={() => selectLocale('zh')}>zh</button>
      <button onClick={() => selectLocale('en')}>en</button>
      <button onClick={() => setCount(count + 1)}>{count}</button>
    </>
  );
}
describe('layout resource ownership', () => {
  it('owns each SSR scope before first render and inherits its parent reader', async () => {
    const root = await snapshot('en', RESOURCE_SCOPES.layout);
    const page = await snapshot('en', RESOURCE_SCOPES.textDemo);
    const owners: ReturnType<typeof useTextScope>['resource'][] = [];
    function Probe() {
      owners.push(useTextScope().resource);
      return null;
    }
    const transport = vi.fn<ResourceReader>();
    render(
      <StrictMode>
        <ResourceLayout initialSnapshot={root} reader={transport}>
          <Probe />
          <Shell location="header" />
          <TextProvider scope={RESOURCE_SCOPES.textDemo} initialSnapshot={page}>
            <ResourceScope scope={RESOURCE_SCOPES.textDemo}>
              <Probe />
              <Page />
            </ResourceScope>
          </TextProvider>
          <Shell location="footer" />
        </ResourceLayout>
      </StrictMode>
    );
    expect(screen.getByTestId('page-title').textContent).toBe('Ready to explore.');
    expect(screen.queryByRole('status')).toBeNull();
    expect(new Set(owners).size).toBeGreaterThan(1);
    expect(owners.some((owner) => owner?.hasText('main', 'en'))).toBe(true);
    expect(owners.some((owner) => owner?.hasText('demo', 'en'))).toBe(true);
    expect(
      owners.every((owner) => !(owner?.hasText('main', 'en') && owner.hasText('demo', 'en')))
    ).toBe(true);
    expect(transport).not.toHaveBeenCalled();
  });
  it('blocks global and page visuals independently and deduplicates nested CSR reads', async () => {
    const common = deferred();
    const demo = deferred();
    const transport = vi.fn<ResourceReader>(async (entry, signal) => {
      await (entry.id === 'main' ? common.promise : demo.promise);
      return reader(entry, signal);
    });
    render(
      <ResourceLayout reader={transport}>
        <Shell location="header" />
        <TextProvider scope={RESOURCE_SCOPES.textDemo}>
          <ResourceScope scope={RESOURCE_SCOPES.textDemo}>
            <Page />
          </ResourceScope>
        </TextProvider>
        <TextProvider scope={RESOURCE_SCOPES.textDemo}>
          <ResourceScope scope={RESOURCE_SCOPES.textDemo}>
            <p>second-page-ready</p>
          </ResourceScope>
        </TextProvider>
      </ResourceLayout>
    );
    expect(screen.queryByTestId('header')).toBeNull();
    await act(async () => {
      common.resolve();
      await common.promise;
    });
    await screen.findByTestId('header');
    expect(screen.queryByTestId('page-title')).toBeNull();
    await act(async () => {
      demo.resolve();
      await demo.promise;
    });
    await screen.findByTestId('page-title');
    expect(screen.getByText('second-page-ready')).toBeDefined();
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it('commits the shell and page language together and preserves component state', async () => {
    const root = await snapshot('en', RESOURCE_SCOPES.layout);
    const page = await snapshot('en', RESOURCE_SCOPES.textDemo);
    const slow = deferred();
    const frames: string[] = [];
    function Frame() {
      useLayoutEffect(() => {
        frames.push(
          ['header', 'page-title', 'footer']
            .map((id) => document.querySelector(`[data-testid="${id}"]`)?.textContent)
            .join('|')
        );
      });
      return null;
    }
    const transport = vi.fn<ResourceReader>(async (entry, signal) => {
      if (entry.url.includes('/zh/') && entry.id === 'demo') await slow.promise;
      return reader(entry, signal);
    });
    render(
      <ResourceLayout initialSnapshot={root} reader={transport}>
        <Shell location="header" />
        <TextProvider scope={RESOURCE_SCOPES.textDemo} initialSnapshot={page}>
          <ResourceScope scope={RESOURCE_SCOPES.textDemo}>
            <Page />
            <Frame />
          </ResourceScope>
        </TextProvider>
        <Shell location="footer" />
      </ResourceLayout>
    );
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(screen.getByRole('button', { name: 'zh' }));
    await waitFor(() => expect(transport).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('header').textContent).toBe('Welcome.');
    expect(screen.getByTestId('page-title').textContent).toBe('Ready to explore.');
    await act(async () => {
      slow.resolve();
      await slow.promise;
    });
    await waitFor(() =>
      expect(screen.getByTestId('page-title').textContent).toBe('准备好探索了。')
    );
    expect(screen.getByTestId('header').textContent).toBe('欢迎。');
    expect(screen.getByTestId('footer').textContent).toBe('欢迎。');
    expect(screen.getByRole('button', { name: '1' })).toBeDefined();
    for (const frame of frames)
      expect(['Welcome.|Ready to explore.|Welcome.', '欢迎。|准备好探索了。|欢迎。']).toContain(
        frame
      );
    fireEvent.click(screen.getByRole('button', { name: 'en' }));
    await waitFor(() =>
      expect(screen.getByTestId('page-title').textContent).toBe('Ready to explore.')
    );
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it('keeps the resource owner when a page view unmounts', async () => {
    const root = await snapshot('en', RESOURCE_SCOPES.layout);
    const page = await snapshot('en', RESOURCE_SCOPES.textDemo);
    const owners: ReturnType<typeof useTextScope>['resource'][] = [];
    function Probe() {
      owners.push(useTextScope().resource);
      return null;
    }
    const transport = vi.fn<ResourceReader>();
    function Tree({ show }: { readonly show: boolean }) {
      return (
        <ResourceLayout initialSnapshot={root} reader={transport}>
          <Probe />
          <Shell location="header" />
          {show ? (
            <TextProvider scope={RESOURCE_SCOPES.textDemo} initialSnapshot={page}>
              <ResourceScope scope={RESOURCE_SCOPES.textDemo}>
                <Page />
              </ResourceScope>
            </TextProvider>
          ) : null}
        </ResourceLayout>
      );
    }
    const { rerender } = render(<Tree show />);
    await act(async () => {});
    rerender(<Tree show={false} />);
    rerender(<Tree show />);
    expect(new Set(owners).size).toBe(1);
    expect(owners[0]?.hasText('demo', 'en')).toBe(false);
    expect(transport).not.toHaveBeenCalled();
  });
  it('creates isolated server owners and restores the same locale before SSR children read', async () => {
    const renderLocale = async (locale: TextLocale) => {
      const root = await snapshot(locale, RESOURCE_SCOPES.layout);
      const page = await snapshot(locale, RESOURCE_SCOPES.textDemo);
      return renderToString(
        <ResourceLayout initialLocale={locale} initialSnapshot={root}>
          <Shell location="header" />
          <TextProvider scope={RESOURCE_SCOPES.textDemo} initialSnapshot={page}>
            <ResourceScope scope={RESOURCE_SCOPES.textDemo}>
              <Page />
            </ResourceScope>
          </TextProvider>
        </ResourceLayout>
      );
    };
    const [en, zh] = await Promise.all([renderLocale('en'), renderLocale('zh')]);
    expect(en).toContain('Ready to explore.');
    expect(en).not.toContain('准备好探索了。');
    expect(zh).toContain('准备好探索了。');
    expect(zh).not.toContain('Ready to explore.');
  });
});

it('includes a newly mounted page in an in-flight layout language change', async () => {
  const main = deferred();
  const demo = deferred();
  const root = await snapshot('en', RESOURCE_SCOPES.layout);
  const transport = vi.fn<ResourceReader>(async (entry, signal) => {
    if (entry.url.includes('/zh/')) await (entry.id === 'main' ? main.promise : demo.promise);
    return reader(entry, signal);
  });
  function Toggle() {
    const [show, setShow] = useState(false);
    const { selectLocale } = useTextLocale();
    return (
      <>
        <button onClick={() => selectLocale('zh')}>switch</button>
        <button onClick={() => setShow(true)}>mount</button>
        {show ? (
          <TextProvider scope={RESOURCE_SCOPES.textDemo}>
            <ResourceScope scope={RESOURCE_SCOPES.textDemo}>
              <Page />
            </ResourceScope>
          </TextProvider>
        ) : null}
      </>
    );
  }
  render(
    <ResourceLayout initialSnapshot={root} reader={transport}>
      <Shell location="header" />
      <Toggle />
    </ResourceLayout>
  );
  fireEvent.click(screen.getByRole('button', { name: 'switch' }));
  fireEvent.click(screen.getByRole('button', { name: 'mount' }));
  await screen.findByTestId('page-title');
  await act(async () => {
    main.resolve();
    await main.promise;
  });
  await waitFor(() =>
    expect(
      transport.mock.calls.some(([entry]) => entry.url.includes('/zh/') && entry.id === 'demo')
    ).toBe(true)
  );
  expect(screen.getByTestId('header').textContent).toBe('Welcome.');
  expect(screen.getByTestId('page-title').textContent).toBe('Ready to explore.');
  await act(async () => {
    demo.resolve();
    await demo.promise;
  });
  await waitFor(() => expect(screen.getByTestId('page-title').textContent).toBe('准备好探索了。'));
  expect(screen.getByTestId('header').textContent).toBe('欢迎。');
});

it.each(['success', 'failure'])(
  'switches while a departed scope is stalled and ignores its late %s',
  async (result) => {
    const [root, page] = await Promise.all([
      snapshot('en', RESOURCE_SCOPES.layout),
      snapshot('en', RESOURCE_SCOPES.textDemo),
    ]);
    const demo = deferred();
    const transport = vi.fn<ResourceReader>(async (entry, signal) => {
      if (entry.id === 'demo' && entry.url.includes('/zh/')) {
        await demo.promise;
        if (result === 'failure') throw new Error('Departed scope failed');
      }
      return reader(entry, signal);
    });
    function Toggle() {
      const [open, setOpen] = useState(true);
      const { selection, selectLocale } = useTextLocale();
      return (
        <>
          <output data-testid="selection">{selection.status}</output>
          <button onClick={() => selectLocale('zh')}>switch</button>
          <button onClick={() => setOpen(false)}>leave</button>
          {open && (
            <TextProvider scope={RESOURCE_SCOPES.textDemo} initialSnapshot={page}>
              <ResourceScope scope={RESOURCE_SCOPES.textDemo}>
                <Page />
              </ResourceScope>
            </TextProvider>
          )}
        </>
      );
    }
    render(
      <ResourceLayout initialSnapshot={root} reader={transport}>
        <Shell location="header" />
        <Toggle />
      </ResourceLayout>
    );
    fireEvent.click(screen.getByText('switch'));
    await waitFor(() =>
      expect(transport.mock.calls.some(([entry]) => entry.id === 'demo')).toBe(true)
    );
    expect(screen.getByTestId('header')).toHaveTextContent('Welcome.');
    expect(screen.getByTestId('page-title')).toHaveTextContent('Ready to explore.');
    fireEvent.click(screen.getByText('leave'));
    try {
      await waitFor(() => expect(screen.getByTestId('header')).toHaveTextContent('欢迎。'));
      expect(screen.getByTestId('selection')).toHaveTextContent('ready');
    } finally {
      await act(async () => {
        demo.resolve();
        await demo.promise;
      });
    }
    expect(screen.getByTestId('header')).toHaveTextContent('欢迎。');
    expect(screen.getByTestId('selection')).toHaveTextContent('ready');
    expect(transport.mock.calls.map(([entry]) => entry.id).sort()).toEqual(['demo', 'main']);
  }
);

it('does not restore a later initial-locale snapshot against the shared selected language', async () => {
  const root = await snapshot('en', RESOURCE_SCOPES.layout);
  const page = await snapshot('en', RESOURCE_SCOPES.textDemo);
  const transport = vi.fn<ResourceReader>(reader);
  function Tree({
    pageSnapshot,
  }: {
    readonly pageSnapshot: import('@frontend/resource-runtime').ResourceSnapshot;
  }) {
    return (
      <ResourceLayout initialSnapshot={root} reader={transport}>
        <TextProvider scope={RESOURCE_SCOPES.textDemo} initialSnapshot={pageSnapshot}>
          <ResourceScope scope={RESOURCE_SCOPES.textDemo}>
            <Page />
          </ResourceScope>
        </TextProvider>
      </ResourceLayout>
    );
  }
  const { rerender } = render(<Tree pageSnapshot={page} />);
  fireEvent.click(screen.getByRole('button', { name: 'zh' }));
  await waitFor(() => expect(screen.getByTestId('page-title').textContent).toBe('准备好探索了。'));
  const later = await snapshot('en', RESOURCE_SCOPES.textDemo);
  rerender(<Tree pageSnapshot={later} />);
  expect(screen.getByTestId('page-title').textContent).toBe('准备好探索了。');
  expect(transport).toHaveBeenCalledTimes(2);
});

it('replaces prepared props only in the intended scope and keeps old readers immutable', async () => {
  const root = await snapshot('en', RESOURCE_SCOPES.layout);
  const page = await snapshot('en', RESOURCE_SCOPES.textDemo);
  const updated = {
    ...page,
    resources: page.resources.map((entry) => {
      if (typeof entry.value !== 'object' || entry.value === null)
        throw new Error('Invalid fixture');
      return { ...entry, value: { ...entry.value, title: 'New prepared snapshot' } };
    }),
  };
  const oldReaders: ReturnType<typeof useText>[] = [];
  function Local({ id }: { readonly id: string }) {
    const text = useText();
    useLayoutEffect(() => {
      oldReaders.push(text);
    }, [text]);
    return <p data-testid={id}>{text.getText('demo', 'title')}</p>;
  }
  function Tree({ initial }: { readonly initial: typeof page }) {
    return (
      <ResourceLayout initialSnapshot={root}>
        <Shell location="parent" />
        <TextProvider scope={RESOURCE_SCOPES.textDemo} initialSnapshot={initial}>
          <ResourceScope scope={RESOURCE_SCOPES.textDemo}>
            <Local id="first" />
          </ResourceScope>
        </TextProvider>
        <TextProvider scope={RESOURCE_SCOPES.textDemo} initialSnapshot={page}>
          <ResourceScope scope={RESOURCE_SCOPES.textDemo}>
            <Local id="second" />
          </ResourceScope>
        </TextProvider>
      </ResourceLayout>
    );
  }
  const { rerender } = render(<Tree initial={page} />);
  rerender(<Tree initial={updated} />);
  expect(screen.getByTestId('first').textContent).toBe('New prepared snapshot');
  expect(screen.getByTestId('second').textContent).toBe('Ready to explore.');
  expect(screen.getByTestId('parent').textContent).toBe('Welcome.');
  expect(oldReaders[0]?.getText('demo', 'title')).toBe('Ready to explore.');
});

it('rejects mismatched or invalid internal preparation without changing the current view', async () => {
  const root = await snapshot('en', RESOURCE_SCOPES.layout);
  const page = await snapshot('en', RESOURCE_SCOPES.textDemo);
  function Probe() {
    const scope = useTextScope();
    const text = useText();
    return (
      <>
        <p data-testid="unchanged">{text.getText('demo', 'title')}</p>
        <button
          onClick={() => {
            expect(() =>
              scope.preparePublication(
                restoreResourceSnapshot(resourcePart('text', RESOURCE_SCOPES.layout, 'en'), root),
                resourcePart('text', RESOURCE_SCOPES.textDemo, 'en')
              )
            ).toThrow();
            expect(() =>
              scope.preparePublication(
                {
                  ...restoreResourceSnapshot(
                    resourcePart('text', RESOURCE_SCOPES.textDemo, 'en'),
                    page
                  ),
                  resources: page.resources.map((entry) => ({ ...entry, value: {} })),
                },
                resourcePart('text', RESOURCE_SCOPES.textDemo, 'en')
              )
            ).toThrow();
          }}
        >
          invalid
        </button>
      </>
    );
  }
  render(
    <ResourceLayout initialSnapshot={root}>
      <TextProvider scope={RESOURCE_SCOPES.textDemo} initialSnapshot={page}>
        <ResourceScope scope={RESOURCE_SCOPES.textDemo}>
          <Probe />
        </ResourceScope>
      </TextProvider>
    </ResourceLayout>
  );
  fireEvent.click(screen.getByRole('button', { name: 'invalid' }));
  expect(screen.getByTestId('unchanged').textContent).toBe('Ready to explore.');
});

it('commits every scope even when the target exceeds the inactive cache capacity', async () => {
  const root = await snapshot('en', RESOURCE_SCOPES.layout);
  const page = await snapshot('en', RESOURCE_SCOPES.textDemo);
  render(
    <ResourceRuntimeProvider reader={reader} inactiveCacheEntries={1}>
      <TextProvider initialLocale="en" scope={RESOURCE_SCOPES.layout} initialSnapshot={root}>
        <ResourceScope scope={RESOURCE_SCOPES.metadata}>
          <Shell location="header" />
          <TextProvider scope={RESOURCE_SCOPES.textDemo} initialSnapshot={page}>
            <ResourceScope scope={RESOURCE_SCOPES.textDemo}>
              <Page />
            </ResourceScope>
          </TextProvider>
        </ResourceScope>
      </TextProvider>
    </ResourceRuntimeProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'zh' }));
  await waitFor(() => expect(screen.getByTestId('header').textContent).toBe('欢迎。'));
  expect(screen.getByTestId('page-title').textContent).toBe('准备好探索了。');
});

it('rejects a snapshot for another scope even when its dictionary requirements match', async () => {
  const root = await snapshot('en', RESOURCE_SCOPES.layout);
  expect(() =>
    renderToString(
      <ResourceRuntimeProvider reader={reader}>
        <TextProvider scope={RESOURCE_SCOPES.metadata} initialSnapshot={root}>
          <ResourceScope scope={RESOURCE_SCOPES.metadata}>
            <Shell location="wrong-scope" />
          </ResourceScope>
        </TextProvider>
      </ResourceRuntimeProvider>
    )
  ).toThrow();
});
