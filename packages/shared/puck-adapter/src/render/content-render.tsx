import { Render } from '@puckeditor/core/rsc';
import { resolveDocument } from '@frontend/ui-document';
import type { ContentIssue, ResolveOptions } from '@frontend/ui-document';
import type { ReactElement } from 'react';
import type { NavigationPresentationCatalog } from '@frontend/content-blocks/schema';
import { contentRegistry, createContentRegistry } from '../registry/content-registry.js';
import { serverConfig } from '../config/server-config.js';
import { scopeNavigation } from '../registry/navigation/scope-navigation.js';
import { toPuckData } from '../config/puck-data.js';

export class InvalidContentDocument extends Error {
  constructor(readonly issues: readonly ContentIssue[]) {
    super('Content document validation failed.');
  }
}

export interface ContentRenderProps extends ResolveOptions {
  readonly document: unknown;
  readonly navigationScope?: string;
  readonly navigationPresentations?: NavigationPresentationCatalog;
}
export function ContentRender({
  document,
  navigationScope,
  navigationPresentations,
  ...options
}: ContentRenderProps): ReactElement {
  const registry = navigationPresentations
    ? createContentRegistry({ navigationPresentations })
    : contentRegistry;
  const result = resolveDocument(document, registry, options);
  if (!result.ok) throw new InvalidContentDocument(result.errors);
  const data =
    navigationScope === undefined
      ? result.value.data
      : scopeNavigation(result.value.data, navigationScope);
  return <Render config={serverConfig} data={toPuckData(data)} />;
}
