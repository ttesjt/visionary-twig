import { expect } from '@playwright/test';
import { projectListSchema } from '@frontend/portfolio/contracts';
import { test } from '../../../../../test/e2e/fixtures/portfolio';
import { PROJECT_DEMO_ENABLED } from '../../../../site/project-data';
import { APPEARANCE_STORAGE_KEY } from '../../policy';
test.beforeEach(() => test.skip(!PROJECT_DEMO_ENABLED, 'Demo data was not selected.'));
test('the Neutral category control uses the same project URLs', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, 'neutral'), APPEARANCE_STORAGE_KEY);
  await page.goto('/projects?page=2');
  await expect(page.getByRole('link', { name: 'Paper Trail' })).toBeVisible();
  const filter = page.getByRole('combobox', { name: 'Category' });
  await filter.selectOption('tools');
  await expect(page).toHaveURL(/\/projects\?category=tools$/);
  await expect(page.getByRole('link', { name: 'Color Index' })).toBeVisible();
  await page.goBack();
  await expect(filter).toHaveValue('');
  await expect(page.getByRole('link', { name: 'Paper Trail' })).toBeVisible();
});

test('selects the larger cover for a single filtered card in Neutral', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 800 });
  await page.addInitScript((key) => localStorage.setItem(key, 'neutral'), APPEARANCE_STORAGE_KEY);
  await page.route(
    (url) => url.pathname === '/api/projects' && url.searchParams.get('category') === 'web',
    async (route) => {
      const response = await route.fetch();
      const { projects } = projectListSchema.parse(await response.json());
      const project = projects.find(({ slug }) => slug === 'field-notes');
      if (!project) throw new Error('Expected the Field Notes sample project.');
      await route.fulfill({ response, json: { projects: [project], hasMore: false } });
    }
  );

  await page.goto('/projects?category=tools');
  await expect(page.getByRole('link', { name: 'Color Index' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Category' }).selectOption('web');
  await expect(page).toHaveURL(/\/projects\?category=web$/);
  const image = page
    .locator('.ui-project-card')
    .filter({ has: page.getByRole('link', { name: 'Field Notes', exact: true }) })
    .getByRole('img', { name: 'A quiet lake among hills' });
  await image.scrollIntoViewIfNeeded();
  expect(await image.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(
    650
  );
  await expect
    .poll(() => image.evaluate((element) => (element as HTMLImageElement).currentSrc))
    .toContain('lake.jpg');
});
