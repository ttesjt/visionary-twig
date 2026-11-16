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
import { contentSchemas } from '../../../site/content-schemas';
import { createPreparedJsonResource } from '../json/resource';
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

/** The server and browser restore the same validated Content snapshot and Text-reference reader. */
export async function serverContent(
  scope: ResourceScopeDefinition,
  locale?: TextLocale
): Promise<ContentReadView<typeof contentSchemas>> {
  const part = planResourceScope(scope, locale).parts.find((value) => value.kind === 'content');
  const snapshot = (await prepareScopeResources(scope, locale)).content;
  if (!part || !snapshot) throw new Error('Scope has no Content resources.');
  return createContentReader(
    createPreparedJsonResource(
      contentSchemas,
      'content',
      restoreResourceSnapshot(part.plan, snapshot),
      part.plan
    ).createView()
  );
}
