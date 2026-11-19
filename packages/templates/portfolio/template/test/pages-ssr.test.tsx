// @vitest-environment node
const PROJECT_FILE_PAGE = {
  slug: 'field-notes',
  namespace: 'project-field-notes',
  filename: 'field-notes.json',
} as const;
import { renderToStaticMarkup } from 'react-dom/server';
import { JsonResource } from '@frontend/prepared-data/resource';
import { prepareResourcePlan } from '@frontend/resource-runtime';
import { expect, it, vi } from 'vitest';
import { ResourceLayout } from '../../src/infra/resources/client';
import { jsonDefinition, createContentReader, planResourceScope } from '../../src/infra/resources';
import {
  readGeneratedJsonURL,
  prepareScopeResources,
  serverContent,
} from '../../src/infra/resources/server';
import Page, {
  generateMetadata,
} from '../../src/app/[locale]/examples/content-projects/[slug]/page';
import { contentSchemas } from '../../src/site/content-schemas';
import { RESOURCE_SCOPES } from '../../src/site/resource-scopes';
import { projectFilePageSchema } from '../../src/features/projects/files/schemas';
import { RESOURCE_STARTUP_TEXT } from '../../src/site/startup-text';

it.each([
  { locale: 'en', heading: 'An illustrated field log', chapters: 'Field log chapters' },
  { locale: 'zh', heading: '带插图的野外记录', chapters: '野外记录目录' },
] as const)(
  'hands off independent global and page snapshots before the first $locale render',
  async ({ locale, heading, chapters }) => {
    const initialSnapshots = await prepareScopeResources(RESOURCE_SCOPES.layout, locale);
    expect(JSON.stringify(initialSnapshots.text)).not.toContain('An illustrated field log');
    expect(JSON.stringify(initialSnapshots.text)).not.toContain('带插图的野外记录');
    const params = Promise.resolve({ locale, slug: PROJECT_FILE_PAGE.slug });
    const children = await Page({ params });
    const html = renderToStaticMarkup(
      <ResourceLayout initialLocale={locale} initialSnapshots={initialSnapshots}>
        {children}
      </ResourceLayout>
    );
    expect(html).toContain(heading);
    expect(html).toContain(chapters);
    expect(html).not.toContain(RESOURCE_STARTUP_TEXT.pending);
    expect(html).not.toContain('field-notes.heading');
    if (locale === 'zh') expect(html).not.toContain('An illustrated field log');
  }
);

vi.mock('server-only', () => ({}));
vi.mock('../../src/infra/resources/server', async (original) => {
  const actual = await original<typeof import('../../src/infra/resources/server')>();
  return {
    ...actual,
    prepareScopeResources: vi.fn(actual.prepareScopeResources),
    serverContent: vi.fn(actual.serverContent),
  };
});

it.each([
  {
    locale: 'en',
    title: 'Field Notes',
    summary: 'A small web journal for observations made outdoors.',
    unavailable: 'The full project write-up is currently unavailable.',
  },
  {
    locale: 'zh',
    title: '野外笔记',
    summary: '记录户外见闻的一本网页日志。',
    unavailable: '暂时无法查看项目正文。',
  },
] as const)(
  'preserves the $locale SSR summary and metadata when Text resolution fails',
  async ({ locale, title, summary, unavailable }) => {
    const prepare = vi.mocked(prepareScopeResources);
    const content = vi.mocked(serverContent);
    const originalPrepare = prepare.getMockImplementation();
    const originalContent = content.getMockImplementation();
    if (!originalPrepare || !originalContent)
      throw new Error('Expected the real server preparation.');
    const definition = jsonDefinition('content', PROJECT_FILE_PAGE.namespace);
    const raw = projectFilePageSchema.parse(await readGeneratedJsonURL(definition.url));
    const damaged = {
      ...raw,
      context: { ...raw.context, nested: [{ $text: { namespace: 'main', key: '' } }] },
    };
    const scope = RESOURCE_SCOPES[PROJECT_FILE_PAGE.namespace];
    const plan = planResourceScope(scope, locale).parts.find(
      (part) => part.kind === 'content'
    )?.plan;
    if (!plan) throw new Error('Expected the page Content plan.');
    const snapshot = await prepareResourcePlan(plan, () => Promise.resolve(damaged));
    const reader = createContentReader(
      new JsonResource(contentSchemas, [
        {
          namespace: PROJECT_FILE_PAGE.namespace,
          version: definition.version,
          value: damaged,
        },
      ]).createView()
    );
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    prepare.mockImplementation(async (requested, language) => {
      const snapshots = await originalPrepare(requested, language);
      return requested === scope ? { ...snapshots, content: snapshot } : snapshots;
    });
    content.mockImplementation((requested, language) =>
      requested === scope ? Promise.resolve(reader) : originalContent(requested, language)
    );
    try {
      const params = Promise.resolve({ locale, slug: PROJECT_FILE_PAGE.slug });
      const metadata = await generateMetadata({ params });
      expect(metadata.title).toBe(title);
      const children = await Page({ params });
      const initialSnapshots = await prepareScopeResources(RESOURCE_SCOPES.layout, locale);
      const html = renderToStaticMarkup(
        <ResourceLayout initialLocale={locale} initialSnapshots={initialSnapshots}>
          {children}
        </ResourceLayout>
      );
      expect(html).toContain(title);
      expect(html).toContain(summary);
      expect(html).toContain(`role="alert">${unavailable}`);
      expect(html).not.toContain('ui-project-page-content');
      expect(html).not.toContain('Text scope is not prepared');
      expect(log).toHaveBeenCalled();
    } finally {
      prepare.mockImplementation(originalPrepare);
      content.mockImplementation(originalContent);
      log.mockRestore();
    }
  }
);
