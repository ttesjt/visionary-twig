import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
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
test('validates the contact form, displays platform links and records one email in the local outbox', async ({
  page,
  request,
  baseURL,
}) => {
  if (!baseURL) throw new Error('Browser base URL is required.');
  const outbox = process.env.PORTFOLIO_CONTACT_OUTBOX;
  if (!outbox) throw new Error('Run this suite with pnpm test:e2e.');
  await page.goto('/contact');
  const platforms = page.getByRole('navigation', { name: 'Platform links' });
  await expect(platforms.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/'
  );
  const submit = page.getByRole('button', { name: 'Send message' });
  await submit.click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();

  const rejected = await request.post('/api/contact?locale=en', {
    headers: { origin: new URL(baseURL).origin },
    data: { email: 'invalid-address', message: 'Invalid input' },
  });
  expect(rejected.status()).toBe(422);

  await page.getByRole('textbox', { name: 'Email' }).fill('visitor@example.test');
  await page.getByRole('textbox', { name: 'Message' }).fill('A sample note.');
  await submit.click();
  await expect(page.getByRole('status')).toHaveText('Message accepted.');
  await expect(page.getByRole('textbox', { name: 'Message' })).toBeEmpty();
  const messages = readdirSync(outbox).filter((file) => file.endsWith('.json'));
  expect(messages).toHaveLength(1);
  const [filename] = messages;
  if (!filename) throw new Error('Missing sample message.');
  const email: unknown = JSON.parse(readFileSync(path.join(outbox, filename), 'utf8'));
  expect(email).toMatchObject({
    from: 'portfolio@example.test',
    to: 'outbox@example.test',
    replyTo: 'visitor@example.test',
    subject: 'Portfolio contact message',
    text: 'Email: visitor@example.test\n\nMessage:\nA sample note.',
  });
});
