import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { z } from 'zod';
import {
  createResourcePlan,
  prepareResourcePlan,
  type ResourceReader,
} from '@frontend/resource-runtime';
import { ResourceRuntimeProvider } from '@frontend/resource-runtime/react';
import { createJsonProvider } from './provider';

it('allows page-specific Config namespaces to inherit a global reader without upward writes', async () => {
  const schemas = {
    app: z.strictObject({ enabled: z.boolean() }),
    viewer: z.strictObject({ zoom: z.number() }),
  };
  const definition = (name: keyof typeof schemas) => ({
    id: 'config:' + name,
    url: '/config/' + name,
    source: 'config',
    version: '1',
    schemaVersion: '1',
    validateArtifact(input: unknown): undefined {
      schemas[name].parse(input);
    },
  });
  const plan = (names: readonly (keyof typeof schemas)[]) =>
    createResourcePlan(names.map(definition), { scope: names.join('-') });
  const config = createJsonProvider('config', schemas, plan, (raw) => raw);
  const transport: ResourceReader = (entry) =>
    Promise.resolve(entry.id === 'config:app' ? { enabled: false } : { zoom: 2 });
  const [root, page] = await Promise.all([
    prepareResourcePlan(plan(['app']), transport),
    prepareResourcePlan(plan(['viewer']), transport),
  ]);
  function Gate({ children }: { readonly children: ReactNode }) {
    const scope = config.useScope();
    return scope?.reader ? children : null;
  }
  function Probe({ local }: { readonly local: boolean }) {
    const reader = config.useReader();
    return (
      <p>
        {String(reader.get('app').enabled)}:
        {local ? reader.get('viewer').zoom : String(reader.has('viewer'))}
      </p>
    );
  }
  render(
    <ResourceRuntimeProvider reader={transport}>
      <config.Provider scope={['app']} initialSnapshot={root}>
        <Gate>
          <Probe local={false} />
          <config.Provider scope={['viewer']} initialSnapshot={page}>
            <Gate>
              <Probe local />
            </Gate>
          </config.Provider>
        </Gate>
      </config.Provider>
    </ResourceRuntimeProvider>
  );
  expect(screen.getByText('false:false')).toBeDefined();
  expect(screen.getByText('false:2')).toBeDefined();
});
