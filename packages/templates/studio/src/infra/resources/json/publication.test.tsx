import { useLayoutEffect, type ReactNode } from 'react';
import { ResourceRuntimeProvider } from '@frontend/resource-runtime/react';
import { act, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  createResourcePlan,
  prepareResourcePlan,
  restoreResourceSnapshot,
} from '@frontend/resource-runtime';
import { createJsonProvider } from './provider';

function Runtime({ children }: { readonly children: ReactNode }) {
  return (
    <ResourceRuntimeProvider reader={() => Promise.reject(new Error('Unexpected network'))}>
      {children}
    </ResourceRuntimeProvider>
  );
}

it('prepares one candidate, publishes that reader, and rejects invalid or superseded candidates', async () => {
  const validate = vi.fn();
  const schemas = { app: z.strictObject({ enabled: z.boolean() }).superRefine(validate) };
  const plan = createResourcePlan([
    {
      id: 'config:app',
      source: 'config',
      url: '/config.json',
      version: '1',
      schemaVersion: '1',
      validateArtifact(value) {
        schemas.app.parse(value);
      },
    },
  ]);
  const empty = createResourcePlan([]);
  const owner = createJsonProvider(
    'config',
    schemas,
    () => empty,
    (raw) => raw
  );
  const first = await prepareResourcePlan(empty, () => Promise.reject(new Error('unexpected')));
  const next = await prepareResourcePlan(plan, () => Promise.resolve({ enabled: true }));
  const prepared = restoreResourceSnapshot(plan, next);
  const managerRef: { current: ReturnType<typeof owner.useScope> } = { current: undefined };
  function Probe() {
    const scope = owner.useScope();
    useLayoutEffect(() => {
      managerRef.current = scope;
    }, [scope]);
    const reader = owner.useReader();
    return <p>{reader.has('app') ? String(reader.get('app').enabled) : 'empty'}</p>;
  }
  const { rerender } = render(
    <owner.Provider scope="app" initialSnapshot={first}>
      <Probe />
    </owner.Provider>,
    { wrapper: Runtime }
  );
  const old = managerRef.current?.reader;
  validate.mockClear();
  const stale = managerRef.current?.preparePublication(prepared, plan);
  rerender(
    <owner.Provider scope="app" initialSnapshot={{ ...first }}>
      <Probe />
    </owner.Provider>
  );
  act(() => {
    stale?.();
  });
  expect(screen.getByText('empty')).toBeDefined();
  expect(() =>
    managerRef.current?.preparePublication(
      {
        ...prepared,
        resources: prepared.resources.map((entry) => ({ ...entry, value: { enabled: 'invalid' } })),
      },
      plan
    )
  ).toThrow();
  validate.mockClear();
  const commit = managerRef.current?.preparePublication(prepared, plan);
  expect(commit).toBeTypeOf('function');
  expect(validate).toHaveBeenCalledTimes(1);
  expect(screen.getByText('empty')).toBeDefined();
  act(() => {
    commit?.();
  });
  expect(screen.getByText('true')).toBeDefined();
  expect(validate).toHaveBeenCalledTimes(1);
  expect(old?.has('app')).toBe(false);
  expect(() =>
    managerRef.current?.preparePublication(
      {
        ...prepared,
        resources: prepared.resources.map((entry) => ({ ...entry, value: { enabled: 'invalid' } })),
      },
      plan
    )
  ).toThrow();
  expect(screen.getByText('true')).toBeDefined();
  // Refreshing startup props preserves independent lazy additions.
  rerender(
    <owner.Provider scope="app" initialSnapshot={{ ...first }}>
      <Probe />
    </owner.Provider>
  );
  expect(screen.getByText('true')).toBeDefined();
});

it('recomposes a changed parent reader without rebuilding the local JSON resource', async () => {
  const localValidation = vi.fn();
  const schemas = {
    app: z.strictObject({ enabled: z.boolean() }),
    viewer: z.strictObject({ zoom: z.number() }).superRefine(localValidation),
  };
  function plan(namespace: keyof typeof schemas) {
    return createResourcePlan([
      {
        id: 'config:' + namespace,
        source: 'config',
        url: '/' + namespace,
        version: '1',
        schemaVersion: '1',
        validateArtifact(value) {
          schemas[namespace].parse(value);
        },
      },
    ]);
  }
  const config = createJsonProvider('config', schemas, plan, (raw) => raw);
  const before = await prepareResourcePlan(plan('app'), () => Promise.resolve({ enabled: false }));
  const after = await prepareResourcePlan(plan('app'), () => Promise.resolve({ enabled: true }));
  const local = await prepareResourcePlan(plan('viewer'), () => Promise.resolve({ zoom: 2 }));
  function Probe() {
    const reader = config.useReader();
    return (
      <p>
        {String(reader.get('app').enabled)}:{reader.get('viewer').zoom}
      </p>
    );
  }
  const tree = (snapshot: typeof before) => (
    <config.Provider scope="app" initialSnapshot={snapshot}>
      <config.Provider scope="viewer" initialSnapshot={local}>
        <Probe />
      </config.Provider>
    </config.Provider>
  );
  const { rerender } = render(tree(before), { wrapper: Runtime });
  localValidation.mockClear();
  rerender(tree(after));
  expect(screen.getByText('true:2')).toBeDefined();
  expect(localValidation).not.toHaveBeenCalled();
});

it('keeps an initial SSR reader when its transport prop is released', async () => {
  const plan = createResourcePlan([
    {
      id: 'config:app',
      source: 'config',
      url: '/config.json',
      version: '1',
      schemaVersion: '1',
      validateArtifact: () => undefined,
    },
  ]);
  const owner = createJsonProvider(
    'config',
    { app: z.boolean() },
    () => plan,
    (raw) => raw
  );
  const snapshot = await prepareResourcePlan(plan, () => Promise.resolve(true));
  function Probe() {
    return <p>{String(owner.useReader().get('app'))}</p>;
  }
  const tree = (initialSnapshot?: unknown) => (
    <owner.Provider scope="app" initialSnapshot={initialSnapshot}>
      <Probe />
    </owner.Provider>
  );
  const { rerender } = render(tree(snapshot), { wrapper: Runtime });
  rerender(tree());
  expect(screen.getByText('true')).toBeDefined();
});
