import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CONTENT_SCHEMA_VERSION } from '@frontend/ui-document';
import type { SqlDatabase } from '@frontend/storage';
import { projectSummarySchema } from '@frontend/portfolio/contracts';
import { readPublishedProjectPage } from '@frontend/portfolio/server';
import { ProjectPageContent, projectPageRegistry } from '@frontend/portfolio/render';
import { ProjectCategoryFilter, ProjectGrid } from '@frontend/portfolio/ui';

describe('portfolio catalog components', () => {
  it('renders localized data with host-selected project and media URLs', () => {
    const project = projectSummarySchema.parse({
      id: 'alpha',
      slug: 'alpha',
      locale: 'zh',
      defaultLocale: 'en',
      title: '甲',
      summary: '第一个项目',
      cover: { objectKey: 'alpha/cover.webp', alt: '封面' },
      categoryIds: ['work'],
      links: [{ label: '源代码', href: 'https://example.test/alpha' }],
    });
    const { rerender } = render(
      <ProjectGrid
        projects={[project]}
        text={{ empty: '没有项目' }}
        projectHref={({ slug }) => '/zh/projects/' + slug}
        coverUrl={({ id }) => '/media/' + id}
      />
    );
    expect(screen.getByRole('article')).toHaveAttribute('lang', 'zh');
    expect(screen.getByRole('link', { name: '甲' })).toHaveAttribute('href', '/zh/projects/alpha');
    expect(screen.getByRole('link', { name: '源代码' })).toHaveAttribute(
      'href',
      'https://example.test/alpha'
    );
    expect(screen.getByRole('img', { name: '封面' })).toHaveAttribute('src', '/media/alpha');

    rerender(<ProjectGrid projects={[]} text={{ empty: '没有项目' }} />);
    expect(screen.getByText('没有项目')).toBeVisible();
    expect(screen.queryByRole('article')).toBeNull();
  });

  it('reports category and all-projects selections through one callback', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();
    const categories = [{ id: 'work', label: '作品', count: 1 }];
    const text = { label: '项目分类', all: '全部项目' };
    const { rerender } = render(
      <ProjectCategoryFilter
        categories={categories}
        selectedCategoryId={null}
        onCategoryChange={onCategoryChange}
        text={text}
      />
    );
    const filter = screen.getByRole('combobox', { name: '项目分类' });
    await user.selectOptions(filter, 'work');
    expect(onCategoryChange).toHaveBeenLastCalledWith('work');

    rerender(
      <ProjectCategoryFilter
        categories={categories}
        selectedCategoryId="work"
        onCategoryChange={onCategoryChange}
        text={text}
      />
    );
    expect(filter).toHaveValue('work');
    await user.selectOptions(filter, screen.getByRole('option', { name: '全部项目' }));
    expect(onCategoryChange).toHaveBeenLastCalledWith(null);
  });
});

it('renders the stored Puck document with its original bindings and publication context', async () => {
  const document = {
    documentId: 'alpha',
    schemaVersion: CONTENT_SCHEMA_VERSION,
    revision: 1,
    locale: 'en',
    data: {
      root: {},
      content: [{ type: 'Heading', props: { id: 'heading', level: 2, text: '' } }],
    },
    bindings: [{ nodeId: 'heading', targetPath: ['text'], sourcePath: ['page', 'heading'] }],
  };
  const database: SqlDatabase = {
    all: () =>
      Promise.resolve([
        {
          projectId: 'alpha',
          locale: 'en',
          revision: 3,
          document_json: JSON.stringify(document),
          context_json: JSON.stringify({ page: { heading: 'Published heading' } }),
        },
      ]),
    batch: () => Promise.reject(new Error('Read-only test database.')),
  };
  const page = await readPublishedProjectPage(database, projectPageRegistry, 'alpha', 'en');
  if (!page) throw new Error('Expected a published page.');
  const output = renderToStaticMarkup(<ProjectPageContent page={page} />);
  expect(output).toContain('lang="en"');
  expect(output).toMatch(/<h2[^>]*>Published heading<\/h2>/u);
  expect(page.document.data).toEqual(document.data);
  expect(page.document.bindings).toEqual(document.bindings);
});
