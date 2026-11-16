import { Suspense } from 'react';
import { act, screen } from '@testing-library/react';
import type { ProjectCategory, ProjectList } from '@frontend/portfolio/contracts';
import { expect, it, vi } from 'vitest';
import { renderWithText } from '../../../../../test/text-render';
import type { PortfolioRead } from '../http-contract';
import { projectLocationHref } from '../../project-location';
import { ProjectListRegion } from './project-list-region';
import type { ProjectRequest } from './project-region-state';

const SOURCE = 'sample-source';

function seededRequest<T>(seed: Promise<PortfolioRead<T>>): ProjectRequest<T> {
  return {
    response: undefined,
    error: undefined,
    pending: false,
    retry: vi.fn(),
    seed,
  };
}

async function renderEmptyPage(categories: Promise<PortfolioRead<readonly ProjectCategory[]>>) {
  const projects = seededRequest<ProjectList>(
    Promise.resolve({ status: 'ready', source: SOURCE, data: { projects: [], hasMore: false } })
  );
  return act(async () =>
    renderWithText(
      <Suspense fallback={<p>Preparing projects</p>}>
        <ProjectListRegion
          projects={projects}
          categories={seededRequest(categories)}
          source={SOURCE}
          location={{ category: 'web', page: 25 }}
          hrefFor={(location) => projectLocationHref('/projects', '', '', 'en', location)}
          locale="en"
          titleAs="h2"
        />
      </Suspense>
    )
  );
}

it.each(['ready', 'failed'] as const)(
  'offers first-page recovery while categories are pending and after they become %s',
  async (status) => {
    let finish = (_result: PortfolioRead<readonly ProjectCategory[]>) => {};
    const categories = new Promise<PortfolioRead<readonly ProjectCategory[]>>((resolve) => {
      finish = resolve;
    });
    await renderEmptyPage(categories);
    expect(screen.getByText('No projects on this page.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'First page' })).toHaveAttribute(
      'href',
      '/projects?category=web'
    );
    expect(screen.queryByText('No projects match this category.')).not.toBeInTheDocument();

    await act(async () => {
      finish(
        status === 'ready'
          ? { status, source: SOURCE, data: [{ id: 'web', label: 'Web', count: 1 }] }
          : { status, code: 'data-source-unavailable' }
      );
      await categories;
    });
    expect(screen.getByText('No projects on this page.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'First page' })).toBeVisible();
  }
);

it('offers category recovery once the completed categories confirm the selection was removed', async () => {
  await renderEmptyPage(Promise.resolve({ status: 'ready', source: SOURCE, data: [] }));
  expect(screen.getByText('No projects match this category.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'All projects' })).toHaveAttribute('href', '/projects');
  expect(screen.queryByRole('link', { name: 'First page' })).not.toBeInTheDocument();
});
