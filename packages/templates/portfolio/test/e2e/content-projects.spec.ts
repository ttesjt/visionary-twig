import { PROJECT_DEMO_ENABLED } from '../../src/site/project-data';
import { expect } from '@playwright/test';
import { test } from './fixtures/portfolio';

test.beforeEach(() => test.skip(!PROJECT_DEMO_ENABLED, 'Demo data was not selected.'));
import { PROJECT_FILES_PATH, projectFilePath } from '../../src/features/projects/files';
import { hydrationErrors, openPreferences } from './fixtures/theme';

test('recovers a file-project page and links to its own detail route', async ({ page }) => {
  await page.goto(PROJECT_FILES_PATH + '?category=web&page=25');
  await expect(page.getByText('No projects on this page.')).toBeVisible();
  await page.getByRole('link', { name: 'First page', exact: true }).click();
  const project = page.getByRole('link', { name: 'Field Notes', exact: true });
  await expect(project).toHaveAttribute('href', projectFilePath('field-notes'));
  await expect(
    page
      .locator('.ui-project-card')
      .filter({ has: page.getByRole('link', { name: 'Field Notes', exact: true }) })
      .getByRole('img', { name: 'A quiet lake among hills' })
  ).toHaveAttribute('src', '/samples/portfolio/lake.jpg');
});

test('renders file Puck details and sharing metadata, then switches language', async ({ page }) => {
  const errors = hydrationErrors(page);
  const databaseRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/projects'))
      databaseRequests.push(request.url());
  });
  await page.goto(projectFilePath('field-notes'));
  await expect(page.getByRole('heading', { name: 'An illustrated field log' })).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://site.example.test/samples/portfolio/lake.jpg'
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://site.example.test/en' + projectFilePath('field-notes')
  );
  const chapter = page
    .getByRole('navigation', { name: 'Field log chapters' })
    .getByRole('link', { name: 'Field study' });
  await chapter.click();
  await expect(page).toHaveURL(/#field-study$/u);
  await openPreferences(page);
  await page.getByRole('combobox', { name: 'Language' }).selectOption('zh');
  await expect(page.getByRole('heading', { name: '带插图的野外记录' })).toBeVisible();
  await expect(page.getByRole('link', { name: '返回项目列表' })).toHaveAttribute(
    'href',
    PROJECT_FILES_PATH + '?lang=zh'
  );
  expect(databaseRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('serves the file list and a single Puck page with scripts disabled', async ({
  browser,
  baseURL,
}) => {
  if (!baseURL) throw new Error('Browser base URL is required.');
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(PROJECT_FILES_PATH + '?lang=zh');
    const project = page.getByRole('link', { name: '野外笔记', exact: true });
    await expect(project).toBeVisible();
    await project.click();
    await expect(page.getByRole('heading', { name: '带插图的野外记录' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: '野外记录目录' })).toBeVisible();
    await page.goto(projectFilePath('color-index'));
    await expect(
      page.getByText('The full project write-up has not been published yet.')
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

for (const route of ['/projects', PROJECT_FILES_PATH]) {
  test('shows six then two projects at ' + route, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('.ui-project-card')).toHaveCount(6);
    await page.getByRole('link', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL(route + '?page=2');
    await expect(page.locator('.ui-project-card')).toHaveCount(2);
    await expect(page.getByRole('link', { name: 'Paper Trail', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Next', exact: true })).toHaveCount(0);
  });
}

test('filters and restores file projects without a collection API', async ({ page }) => {
  const databaseRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/projects'))
      databaseRequests.push(request.url());
  });
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(PROJECT_FILES_PATH + '?page=2');
  await expect(page.getByRole('link', { name: 'Paper Trail', exact: true })).toBeVisible();
  await page
    .getByRole('group', { name: 'Category', exact: true })
    .getByRole('link', { name: 'Tools', exact: true })
    .click();
  await expect(page).toHaveURL(PROJECT_FILES_PATH + '?category=tools');
  await expect(page.getByRole('link', { name: 'Color Index', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('link', { name: 'Paper Trail', exact: true })).toBeVisible();
  await page.goForward();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Color Index', exact: true })).toBeVisible();
  await openPreferences(page);
  await page.getByRole('combobox', { name: 'Language' }).selectOption('zh');
  await expect(page.getByRole('link', { name: '色彩索引', exact: true })).toBeVisible();
  expect(databaseRequests).toEqual([]);
});
