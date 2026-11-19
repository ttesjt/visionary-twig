import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { planResourceScope } from '../../src/infra/resources';
import { findProjectFilePage, projectFileScope } from '../../src/features/projects/files';
import { RESOURCE_SCOPES } from '../../src/site/resource-scopes';
import { TEXT_LOCALES } from '../../src/site/text';

const page = findProjectFilePage('field-notes');
if (!page) throw new Error('Expected the Field Notes demo registration.');
export const FIELD_NOTES_PAGE = page;
export const FIELD_NOTES_SCOPE = projectFileScope(page.namespace);

export function resourceRequestURL(input: Parameters<typeof fetch>[0]): string {
  return typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
}

/** Serve exactly the prepared artifacts addressed by the real global/page plans. */
export function readProjectResource(url: string): unknown {
  const pathname = new URL(url, 'https://site.example.test').pathname;
  for (const locale of TEXT_LOCALES) {
    for (const scope of [RESOURCE_SCOPES.layout, FIELD_NOTES_SCOPE]) {
      for (const part of planResourceScope(scope, locale).parts) {
        const resource = part.plan.resources.find((entry) => entry.url === pathname);
        if (!resource) continue;
        const file =
          part.kind === 'text'
            ? 'text/' + locale + '/' + resource.id + '.json'
            : part.kind + '/' + resource.id.slice(part.kind.length + 1) + '.json';
        return JSON.parse(
          readFileSync(resolve(import.meta.dirname, '../../.generated', file), 'utf8')
        ) as unknown;
      }
    }
  }
  throw new Error('Unexpected project resource request: ' + pathname);
}
