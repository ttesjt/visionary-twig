import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { prepareScopeResources, serverConfig, serverContent } from './server';
import { planResourceScope } from '../planning/scope-plan';
import { RESOURCE_SCOPES } from '../../../site/resource-scopes';
import { DEFAULT_TEXT_LOCALE } from '../../../site/text';

it('restores server Config/Content from the same snapshots consumed by the browser', async () => {
  const scope = RESOURCE_SCOPES.layout;
  const [config, content, snapshots] = await Promise.all([
    serverConfig(scope, DEFAULT_TEXT_LOCALE),
    serverContent(scope, DEFAULT_TEXT_LOCALE),
    prepareScopeResources(scope, DEFAULT_TEXT_LOCALE),
  ]);
  const parts = planResourceScope(scope, DEFAULT_TEXT_LOCALE).parts;
  const expected = (kind: 'config' | 'content', namespace: string) => {
    const key = parts
      .find((part) => part.kind === kind)
      ?.plan.resources.find((resource) => resource.id === kind + ':' + namespace)?.key;
    if (!key) throw new Error('Missing fixture definition');
    return snapshots[kind]?.resources.find((entry) => entry.key === key)?.value;
  };
  expect(config.get('app')).toEqual(expected('config', 'app'));
  expect(content.get('base')).toEqual(expected('content', 'base'));
  expect(Object.isFrozen(config.get('app'))).toBe(true);
  expect(Object.isFrozen(content.get('base'))).toBe(true);
});
