import { resourcePart } from './resource-part';
import { renderToString } from 'react-dom/server';
import { render, screen, fireEvent } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { prepareResourcePlan, type ResourceReader } from '@frontend/resource-runtime';
import { ResourceRuntimeProvider } from '@frontend/resource-runtime/react';
import { ResourceScope } from '../../src/infra/resources/client';
import { ResourceLayout } from '../../src/infra/resources/client';
import { ContentProvider, useContent } from '../../src/infra/resources/client';
import { TextProvider, useText } from '../../src/infra/resources/client';
import { RESOURCE_SCOPES, planResourceScope } from '../../src/infra/resources/index';
import { jsonReader } from '../json-resources';
const reader: ResourceReader = (entry, signal) =>
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
function Notes() {
  return <p>{useContent().get('making-notes').entries[0]?.technique}</p>;
}
function Greeting() {
  return <p>{useText().getText('main', 'home.title')}</p>;
}

it('loads a Content-only scope without a TextProvider or locale, and reuses its SSR snapshot', async () => {
  const transport = vi.fn<ResourceReader>(reader);
  const tree = (
    <ResourceRuntimeProvider reader={transport}>
      <ContentProvider scope={RESOURCE_SCOPES.makingNotes}>
        <ResourceScope scope={RESOURCE_SCOPES.makingNotes}>
          <Notes />
        </ResourceScope>
      </ContentProvider>
    </ResourceRuntimeProvider>
  );
  render(tree);
  await screen.findByText('Graphite on paper');
  expect(transport.mock.calls.map(([entry]) => entry.id)).toEqual(['content:making-notes']);
  const snapshot = await prepareResourcePlan(
    resourcePart('content', RESOURCE_SCOPES.makingNotes),
    reader
  );
  const noHTTP = vi.fn<ResourceReader>();
  expect(
    renderToString(
      <ResourceRuntimeProvider reader={noHTTP}>
        <ContentProvider scope={RESOURCE_SCOPES.makingNotes} initialSnapshot={snapshot}>
          <ResourceScope scope={RESOURCE_SCOPES.makingNotes}>
            <Notes />
          </ResourceScope>
        </ContentProvider>
      </ResourceRuntimeProvider>
    )
  ).toContain('Graphite on paper');
  expect(noHTTP).not.toHaveBeenCalled();
});
it('ignores nearby unrequested providers and follows only the explicitly supplied scope', async () => {
  const transport = vi.fn<ResourceReader>(reader);
  render(
    <ResourceRuntimeProvider reader={transport}>
      <TextProvider scope={RESOURCE_SCOPES.metadata}>
        <ContentProvider scope={RESOURCE_SCOPES.layout}>
          <ResourceScope scope={RESOURCE_SCOPES.metadata}>
            <Greeting />
          </ResourceScope>
        </ContentProvider>
      </TextProvider>
    </ResourceRuntimeProvider>
  );
  await screen.findByText('Welcome.');
  expect(transport.mock.calls.map(([entry]) => entry.id)).toEqual(['main']);
});
it('seeds partial SSR data and lets the single loader fetch/retry only missing resources', async () => {
  const text = await prepareResourcePlan(
    resourcePart('text', RESOURCE_SCOPES.layout, 'en'),
    reader
  );
  let offline = true;
  const transport = vi.fn<ResourceReader>((entry, signal) => {
    if (offline && entry.id === 'config:app') return Promise.reject(new Error('offline'));
    return reader(entry, signal);
  });
  render(
    <ResourceLayout initialSnapshots={{ text }} reader={transport}>
      <Greeting />
    </ResourceLayout>
  );
  await screen.findByRole('alert');
  expect(screen.queryByText('Welcome.')).toBeNull();
  expect(transport.mock.calls.some(([entry]) => entry.id === 'main')).toBe(false);
  offline = false;
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByText('Welcome.');
  expect(transport.mock.calls.filter(([entry]) => entry.id === 'config:app')).toHaveLength(2);
  expect(transport.mock.calls.filter(([entry]) => entry.id === 'content:base')).toHaveLength(1);
  expect(transport.mock.calls.some(([entry]) => entry.id === 'main')).toBe(false);
});
it('requires a publisher and protects incomplete startup plans', () => {
  const transport = vi.fn<ResourceReader>();
  expect(() =>
    renderToString(
      <ResourceRuntimeProvider reader={transport}>
        <ResourceScope scope={RESOURCE_SCOPES.makingNotes}>
          <p>unreachable</p>
        </ResourceScope>
      </ResourceRuntimeProvider>
    )
  ).toThrow(/Missing resource Provider for content/);
  expect(() =>
    renderToString(
      <ResourceRuntimeProvider reader={transport}>
        <ContentProvider scope={RESOURCE_SCOPES.contentDemo}>
          <ResourceScope scope={RESOURCE_SCOPES.makingNotes}>
            <p>unreachable</p>
          </ResourceScope>
        </ContentProvider>
      </ResourceRuntimeProvider>
    )
  ).toThrow(/omits unprepared Provider requirements/);
  expect(transport).not.toHaveBeenCalled();
});
it('plans all declared kinds together while keeping JSON-only plans independent of locale', () => {
  const root = planResourceScope(RESOURCE_SCOPES.layout, 'en');
  expect(root.plan.resources.map((entry) => entry.id).sort()).toEqual([
    'config:app',
    'content:base',
    'main',
  ]);
  expect(planResourceScope(RESOURCE_SCOPES.makingNotes).plan.key).toBe(
    planResourceScope(RESOURCE_SCOPES.makingNotes, 'zh').plan.key
  );
  expect(() => planResourceScope(RESOURCE_SCOPES.textDemo)).toThrow(/locale/);
  expect(root.plan.key).not.toBe(planResourceScope(RESOURCE_SCOPES.layout, 'zh').plan.key);
});
