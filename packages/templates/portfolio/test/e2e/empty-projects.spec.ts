import { expect } from '@playwright/test';
import { PROJECT_DEMO_ENABLED } from '../../src/site/project-data';
import { test } from './fixtures/portfolio';

test('a clean starter renders empty SQL and file collections without errors', async ({
  page,
  request,
}) => {
  test.skip(PROJECT_DEMO_ENABLED, 'This acceptance checks the empty starter.');
  const response = await request.get('/api/projects?locale=en');
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ projects: [], hasMore: false });
  for (const url of ['/projects', '/examples/content-projects']) {
    await page.goto(url);
    await expect(page.getByText('No projects yet.')).toBeVisible();
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
    await expect(page.locator('.ui-portfolio-project-error')).toHaveCount(0);
    await expect(page.locator('.ui-project-card')).toHaveCount(0);
  }
});
