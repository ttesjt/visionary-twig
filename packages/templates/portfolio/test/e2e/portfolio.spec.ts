import { expect } from '@playwright/test';
import { test } from './fixtures/portfolio';
import { PROJECT_DEMO_ENABLED } from '../../src/site/project-data';
test.beforeEach(() => test.skip(!PROJECT_DEMO_ENABLED, 'Demo data was not selected.'));
test('renders localized project data and published Puck content without JavaScript', async ({
  browser,
  baseURL,
  request,
}) => {
  if (!baseURL) throw new Error('Browser base URL is required.');
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/projects?lang=zh');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
    await expect(page.getByRole('heading', { name: '项目', exact: true })).toBeVisible();
    await page.getByRole('link', { name: '下一页' }).click();
    await expect(page.getByRole('link', { name: '纸上踪迹' })).toBeVisible();
    await page.getByRole('link', { name: '上一页' }).click();
    const project = page.getByRole('link', { name: '野外笔记' });
    await expect(project).toBeVisible();
    await expect(page.getByRole('img', { name: '置顶项目' })).toBeVisible();
    await expect(page.getByText('野外日志', { exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: '色彩索引色板图标' })).toBeVisible();
    await project.click();
    await expect(page.getByRole('heading', { name: '带插图的野外记录' })).toBeVisible();
    const cover = page.getByRole('img', { name: '群山之间的宁静湖泊' });
    await expect(cover).toBeVisible();
    const media = await cover.getAttribute('src');
    if (!media) throw new Error('Missing rendered media URL.');
    expect((await request.get(media)).headers()['content-type']).toBe('image/jpeg');
    await expect(page.getByRole('link', { name: '返回项目列表' })).toHaveAttribute(
      'href',
      '/projects?lang=zh'
    );
  } finally {
    await context.close();
  }
  const absent = await request.get(
    '/api/projects/media/color-index?key=samples%2Fportfolio%2Flake.jpg'
  );
  expect(absent.status()).toBe(404);
});

test('restores category and page URLs with the neutral controls', async ({ page }) => {
  await page.goto('/projects?page=2');
  await expect(page.getByRole('link', { name: 'Paper Trail', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Category' }).selectOption('tools');
  await expect(page).toHaveURL('/projects?category=tools');
  await expect(page.getByRole('link', { name: 'Color Index', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('/projects?page=2');
  await page.goForward();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Color Index', exact: true })).toBeVisible();
});
