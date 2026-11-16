import { resourcePart } from './resource-part';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEXT_LOCALES } from '../../src/infra/resources/index';

import { RESOURCE_SCOPES } from '../../src/site/resource-scopes';
import { planResourceScope } from '../../src/infra/resources/index';
import type { TextProvider } from '../../src/infra/resources/client';
import { prepareResourcePlan, restoreResourceSnapshot } from '@frontend/resource-runtime';
describe('host text declarations', () => {
  for (const locale of TEXT_LOCALES)
    it(`owns and validates every generated ${locale} resource`, async () => {
      const plan = resourcePart('text', RESOURCE_SCOPES.textDemo, locale);
      const snapshot = await prepareResourcePlan(plan, (resource) => {
        const input: unknown = JSON.parse(
          readFileSync(
            path.resolve(
              import.meta.dirname,
              '../../.generated/text',
              locale,
              resource.id + '.json'
            ),
            'utf8'
          )
        );
        return Promise.resolve(input);
      });
      expect(restoreResourceSnapshot(plan, snapshot).context.locale).toBe(locale);
      expect(snapshot.resources).toHaveLength(1);
      expect(plan.resources.map((entry) => entry.id)).toEqual(['demo']);
    });
  it('separates language identities and owns one version mapping', () => {
    expect(resourcePart('text', RESOURCE_SCOPES.textDemo, 'en').key).not.toBe(
      resourcePart('text', RESOURCE_SCOPES.textDemo, 'zh').key
    );
    for (const resource of resourcePart('text', RESOURCE_SCOPES.textDemo, 'en').resources)
      expect(resource.url).toContain(`/${resource.version}/en/`);
  });
});

// These checks consume actual generated JSON types, not a hand-maintained key fixture.
function generatedKeyContract(
  text: ReturnType<typeof import('../../src/infra/resources/client').useText>
) {
  text.getText('main', 'home.title');
  text.getText('demo', 'greeting');
  text.getText('demo', 'greeting', { name: 'Reader' });
  // @ts-expect-error keys are derived from prepared default dictionaries
  text.getText('main', 'home.typo');
  // @ts-expect-error variables are derived from prepared default strings
  text.getText('demo', 'greeting', { fileName: 'Reader' });
}
void generatedKeyContract;

it('keeps scope identity and resource membership together in every declaration', () => {
  const scopes = Object.values(RESOURCE_SCOPES);
  expect(new Set(scopes.map((scope) => scope.id)).size).toBe(scopes.length);
  for (const scope of scopes) {
    const plan = planResourceScope(scope, 'en').plan;
    expect(plan.context.scope).toBe(scope.id);
    expect(plan.resources.map((resource) => resource.id).sort()).toEqual(
      [
        ...scope.text,
        ...scope.config.map((name) => 'config:' + name),
        ...scope.content.map((name) => 'content:' + name),
      ].sort()
    );
    expect(Object.isFrozen(scope)).toBe(true);
    expect(Object.isFrozen(scope.text)).toBe(true);
  }
  // Equal dictionary needs still have different scope/snapshot identities.
  expect(resourcePart('text', RESOURCE_SCOPES.layout, 'en').key).not.toBe(
    resourcePart('text', RESOURCE_SCOPES.metadata, 'en').key
  );
});
function scopeTypeContract(accept: (props: Parameters<typeof TextProvider>[0]) => void) {
  accept({ scope: RESOURCE_SCOPES.textDemo, children: null });
  // @ts-expect-error unknown scope IDs cannot enter the planner
  planResourceScope({ id: 'text-dmeo', text: ['demo'] });
  // @ts-expect-error a valid ID cannot be combined with another scope's requirements
  planResourceScope({ id: RESOURCE_SCOPES.textDemo.id, text: RESOURCE_SCOPES.layout.text });
  accept({
    // @ts-expect-error Provider uses the same discriminated scope contract
    scope: { id: RESOURCE_SCOPES.textDemo.id, text: RESOURCE_SCOPES.layout.text },
    children: null,
  });
  accept({
    // @ts-expect-error split page/namespaces props are no longer a valid Provider API
    page: RESOURCE_SCOPES.textDemo.id,
    namespaces: RESOURCE_SCOPES.layout.text,
    children: null,
  });
  // @ts-expect-error callers must explicitly choose a scope instead of relying on a demo default
  planResourceScope();
}
void scopeTypeContract;
