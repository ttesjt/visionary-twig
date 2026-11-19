import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { readGeneratedText } from '../text/server';
import { readGeneratedJsonURL } from '../json/server';
import {
  textDefinition,
  isTextNamespace,
  DEFAULT_TEXT_LOCALE,
  TEXT_LOCALES,
  TEXT_NAMESPACES,
} from '../text';
import { jsonDefinition } from '../json/registry';
import config from '../../../../.generated/config/resources.json';
import content from '../../../../.generated/content/resources.json';
it('resolves every prepared manifest entry through generated server imports', async () => {
  for (const locale of TEXT_LOCALES)
    for (const namespace of TEXT_NAMESPACES) {
      if (!isTextNamespace(namespace)) throw new Error('Unprepared Text namespace.');
      const value = await readGeneratedText(textDefinition(namespace, locale).url);
      expect(value).toBeTypeOf('object');
    }
  for (const manifest of [config, content]) {
    if (manifest.kind !== 'config' && manifest.kind !== 'content') throw new Error('Unknown kind');
    for (const namespace of Object.keys(manifest.resources)) {
      const file = path.resolve(
        import.meta.dirname,
        '../../../../.generated',
        manifest.kind,
        namespace + '.json'
      );
      expect(await readGeneratedJsonURL(jsonDefinition(manifest.kind, namespace).url)).toEqual(
        JSON.parse(readFileSync(file, 'utf8'))
      );
    }
  }
  await expect(readGeneratedText('/unknown')).rejects.toThrow();
  await expect(readGeneratedJsonURL('/unknown')).rejects.toThrow();
});

it('prepares and projects the same complete scope used by browser loading', async () => {
  const { prepareScopeResources } = await import('./server');
  const { planResourceScope, RESOURCE_SCOPES } = await import('../index');
  for (const scope of Object.values(RESOURCE_SCOPES)) {
    const plan = planResourceScope(scope, scope.text.length ? DEFAULT_TEXT_LOCALE : undefined);
    const snapshots = await prepareScopeResources(
      scope,
      scope.text.length ? DEFAULT_TEXT_LOCALE : undefined
    );
    expect(
      Object.values(snapshots)
        .flatMap((snapshot) => snapshot.resources.map((entry) => entry.key))
        .sort()
    ).toEqual(plan.plan.resources.map((entry) => entry.key).sort());
    for (const part of plan.parts) expect(snapshots[part.kind]?.planKey).toBe(part.plan.key);
  }
});
