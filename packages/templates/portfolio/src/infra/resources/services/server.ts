import 'server-only';
import type { TextResourceOptions } from '@frontend/text-catalog/resource';
import { cache } from 'react';
import { prepareResourcePlan, restoreResourceSnapshot } from '@frontend/resource-runtime';
import { createPreparedTextResource, type TextLocale } from '../text';
import { readGeneratedText } from '../text/server';
import { readGeneratedJsonURL } from '../json/server';
import { planResourceScope } from '../planning/scope-plan';
import { splitScopeSnapshot, type ScopeSnapshots } from '../planning/snapshots';
import type { ResourceKind } from '../constants/kinds';
import type { ResourceScopeDefinition } from '../../../site/resource-scopes';
import { configSchemas, contentSchemas } from '../json/registry';
import type { JsonReadView, JsonSchemas } from '@frontend/prepared-data/resource';
import { createPreparedJsonResource } from '@frontend/resource-runtime/json';
import { createContentReader, type ContentReadView } from '../json/content-reader';
// Primitive cache keys deduplicate Layout/Page/metadata reads within this server request.
const read = cache((kind: ResourceKind, url: string) =>
  kind === 'text' ? readGeneratedText(url) : readGeneratedJsonURL(url)
);
export const prepareScopeResources = cache(
  async (scope: ResourceScopeDefinition, locale?: TextLocale): Promise<ScopeSnapshots> => {
    const target = planResourceScope(scope, locale);
    const kinds = new Map(
      target.parts.flatMap((part) =>
        part.plan.resources.map((resource) => [resource.key, part.kind] as const)
      )
    );
    const snapshot = await prepareResourcePlan(target.plan, (resource) => {
      const kind = kinds.get(resource.key);
      if (!kind) throw new Error('Resource is outside its scope plan.');
      return read(kind, resource.url);
    });
    return splitScopeSnapshot(target, snapshot);
  }
);
export async function serverText(
  locale: TextLocale,
  scope: ResourceScopeDefinition,
  options: Pick<TextResourceOptions, 'onMissing'> = {}
) {
  const target = planResourceScope(scope, locale);
  const part = target.parts.find((value) => value.kind === 'text');
  const snapshot = (await prepareScopeResources(scope, locale)).text;
  if (!part || !snapshot) throw new Error('Scope has no Text resources.');
  return createPreparedTextResource(
    restoreResourceSnapshot(part.plan, snapshot),
    part.plan,
    options
  ).createView(locale);
}

async function serverJson<R extends JsonSchemas>(
  kind: 'config' | 'content',
  schemas: R,
  scope: ResourceScopeDefinition,
  locale?: TextLocale
): Promise<JsonReadView<R>> {
  const part = planResourceScope(scope, locale).parts.find((value) => value.kind === kind);
  const snapshot = (await prepareScopeResources(scope, locale))[kind];
  if (!part || !snapshot) throw new Error('Scope has no ' + kind + ' resources.');
  return createPreparedJsonResource(
    schemas,
    kind,
    restoreResourceSnapshot(part.plan, snapshot),
    part.plan
  ).createView();
}
/** Server and browser consume the same validated, language-independent Content artifacts. */
export async function serverContent(
  scope: ResourceScopeDefinition,
  locale?: TextLocale
): Promise<ContentReadView<typeof contentSchemas>> {
  return createContentReader(await serverJson('content', contentSchemas, scope, locale));
}
/** Reads prepared public configuration without source conversion or client Provider initialization. */
export function serverConfig(
  scope: ResourceScopeDefinition,
  locale?: TextLocale
): Promise<JsonReadView<typeof configSchemas>> {
  return serverJson('config', configSchemas, scope, locale);
}
