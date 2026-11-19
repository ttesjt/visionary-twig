// @vitest-environment node
const PROJECT_FILE_PAGE = {
  slug: 'field-notes',
  namespace: 'project-field-notes',
  filename: 'field-notes.json',
} as const;
import { expect, it, vi } from 'vitest';
import { composeTextViews } from '@frontend/text-catalog/resource';
import { restoreResourceSnapshot } from '@frontend/resource-runtime';
import { planResourceScope } from '../../src/infra/resources';
import { serverContent, serverText } from '../../src/infra/resources/server';
import { RESOURCE_SCOPES } from '../../src/site/resource-scopes';
import { PROJECT_FILE_INDEX } from '../../src/features/projects/files/constants';
import { fileProjectDetail } from '../../src/features/projects/files/pages.server.ts';
import { readFileProjectPage } from '../../src/features/projects/files/pages';

vi.mock('server-only', () => ({}));

it.each(['en', 'zh'] as const)(
  'prepares the page independently and resolves its raw bindings for %s',
  async (locale) => {
    const detail = await fileProjectDetail(PROJECT_FILE_PAGE.slug, locale);
    expect(detail?.snapshots?.content?.resources).toHaveLength(1);
    expect(detail?.snapshots?.text?.resources).toHaveLength(1);
    if (!detail) throw new Error('Expected Field Notes.');
    const scope = RESOURCE_SCOPES[PROJECT_FILE_PAGE.namespace];
    for (const part of planResourceScope(scope, locale).parts) {
      const snapshot: unknown = JSON.parse(JSON.stringify(detail.snapshots?.[part.kind]));
      expect(restoreResourceSnapshot(part.plan, snapshot).resources).toHaveLength(1);
    }
    const content = await serverContent(scope, locale);
    const text = composeTextViews(
      await serverText(locale, RESOURCE_SCOPES.metadata),
      await serverText(locale, scope)
    );
    expect(content.has(PROJECT_FILE_INDEX)).toBe(false);
    const raw = content.get(PROJECT_FILE_PAGE.namespace);
    const resolved = content.getResolved(PROJECT_FILE_PAGE.namespace, { text });
    const result = readFileProjectPage(detail.project, () => resolved);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw result.error;
    const rawBindings: unknown = raw.document.bindings;
    expect(result.page.document.bindings).toEqual(rawBindings);
    expect(result.page.context).toMatchObject({
      publication: { heading: locale === 'en' ? 'An illustrated field log' : '带插图的野外记录' },
    });
    expect(raw.context).toMatchObject({
      publication: { heading: { $text: { namespace: 'field-notes', key: 'heading' } } },
    });
    expect(readFileProjectPage(detail.project, () => ({ ...resolved, document: {} })).status).toBe(
      'invalid-document'
    );
  }
);

it('returns no page snapshot for a summary-only project or an unknown slug', async () => {
  expect(await fileProjectDetail('missing', 'en')).toBeUndefined();
  expect(await fileProjectDetail('color-index', 'en')).toMatchObject({
    project: { slug: 'color-index' },
    snapshots: undefined,
  });
});
