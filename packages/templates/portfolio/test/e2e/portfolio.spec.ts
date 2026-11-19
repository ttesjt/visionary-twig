import { PROJECT_DEMO_ENABLED } from '../../src/site/project-data';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { expect, type Route } from '@playwright/test';

test.beforeEach(() => test.skip(!PROJECT_DEMO_ENABLED, 'Demo data was not selected.'));
import { PORTFOLIO_SOURCE_HEADER } from '../../src/features/projects/sql';
import { test } from './fixtures/portfolio';
import { openPreferences } from './fixtures/theme';

async function replacePortfolioPayload(route: Route, json: unknown): Promise<void> {
  const response = await route.fetch();
  await route.fulfill({ response, json });
}

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

test('keeps navigation, locale, pagination and category selection connected', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Small projects, made with care.' })
  ).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('link', { name: 'About' }).click();
  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
  await nav.getByRole('link', { name: 'Projects' }).click();
  await expect(page.getByRole('link', { name: 'Field Notes' })).toBeVisible();
  await page.getByRole('link', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\?page=2$/);
  await expect(page.getByRole('link', { name: 'Paper Trail' })).toBeVisible();
  const filters = page.getByRole('group', { name: 'Category', exact: true });
  const all = filters.getByRole('link', { name: 'All projects', exact: true });
  await expect(all).toHaveAttribute('aria-current', 'page');
  await expect(all).toHaveAttribute('href', '/projects?page=2');
  const pageTwoHistorySize = await page.evaluate(() => window.history.length);
  await all.click();
  await expect(page).toHaveURL(/\/projects\?page=2$/);
  await expect(page.getByRole('link', { name: 'Paper Trail' })).toBeVisible();
  expect(await page.evaluate(() => window.history.length)).toBe(pageTwoHistorySize);
  await filters.getByRole('link', { name: 'Tools', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Color Index' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Paper Trail' })).toHaveCount(0);
  await expect(page).toHaveURL(/\/projects\?category=tools$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/projects\?page=2$/);
  await expect(page.getByRole('link', { name: 'Paper Trail' })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/projects\?category=tools$/);
  await expect(page.getByRole('link', { name: 'Color Index' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Tools', exact: true })).toHaveAttribute(
    'aria-current',
    'page'
  );
  await expect(page.getByRole('link', { name: 'Color Index' })).toBeVisible();
  const historySize = await page.evaluate(() => window.history.length);
  await page.getByRole('link', { name: 'Tools', exact: true }).click();
  expect(await page.evaluate(() => window.history.length)).toBe(historySize);
  const categories = await request.get('/api/projects/categories?locale=en');
  expect(await categories.json()).toEqual([
    { id: 'web', label: 'Web', count: 5 },
    { id: 'tools', label: 'Tools', count: 3 },
  ]);

  await openPreferences(page);
  await page.getByRole('combobox', { name: 'Language' }).selectOption('zh');
  await expect(page.getByRole('heading', { name: '项目', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '色彩索引' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
});

test('shows a summary-only project and emits project-specific sharing metadata', async ({
  page,
}) => {
  await page.goto('/projects/field-notes?lang=zh');
  await expect(page.getByRole('heading', { name: '野外笔记', exact: true })).toBeVisible();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', '野外笔记');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://site.example.test/api/projects/media/field-notes?key=samples%2Fportfolio%2Flake.jpg'
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://site.example.test/zh/projects/field-notes'
  );
  await page.goto('/projects/color-index');
  await expect(page.getByRole('heading', { name: 'Color Index', exact: true })).toBeVisible();
  await expect(
    page.getByText('The full project write-up has not been published yet.')
  ).toBeVisible();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Color Index');
});

test('opens and navigates to Puck chapter anchors below the sticky Header', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 460 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/projects/field-notes#field-study');
  const heading = page.getByRole('heading', { name: 'Field study', exact: true });
  const header = page.getByRole('banner');
  async function expectUnobscured() {
    await expect(heading).toBeInViewport();
    await expect
      .poll(async () => {
        const [target, bar] = await Promise.all([heading.boundingBox(), header.boundingBox()]);
        return Boolean(target && bar && target.y >= bar.y + bar.height);
      })
      .toBe(true);
  }
  await expectUnobscured();

  await page.goto('/projects/field-notes');
  const readingNav = page.getByRole('navigation', { name: 'Field log chapters' });
  const chapter = readingNav.getByRole('link', { name: 'Field study' });
  await expect(chapter).toHaveAttribute('href', '#field-study');
  await chapter.press('Enter');
  await expect(page).toHaveURL(/#field-study$/u);
  await expectUnobscured();
  await expect(page.locator('#field-study')).toBeFocused();
});

test('rejects a category change from a different data source', async ({ page, request }) => {
  const response = await request.get('/api/projects/categories?locale=en');
  const source = response.headers()[PORTFOLIO_SOURCE_HEADER.toLowerCase()];
  expect(source).toBeTruthy();
  const conflict = await request.get('/api/projects?locale=en', {
    headers: { [PORTFOLIO_SOURCE_HEADER]: 'old-source' },
  });
  expect(conflict.status()).toBe(409);
  expect(await conflict.json()).toEqual({ code: 'source-changed' });
  await page.route('**/api/projects?*', async (route) => {
    expect(route.request().headers()[PORTFOLIO_SOURCE_HEADER.toLowerCase()]).toBe(source);
    const original = await route.fetch();
    await route.fulfill({
      response: original,
      headers: { ...original.headers(), [PORTFOLIO_SOURCE_HEADER.toLowerCase()]: 'different' },
    });
  });
  await page.goto('/projects');
  await expect(page.getByRole('link', { name: 'Field Notes' })).toBeVisible();
  const categories = page.getByRole('group', { name: 'Category', exact: true });
  await categories.getByRole('link', { name: 'Tools', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Color Index' })).toHaveCount(0);
  await expect(categories).toBeVisible();
});

test('serves shared project URLs and recovers from an empty page or deleted category', async ({
  page,
}) => {
  await page.goto('/projects?lang=zh&category=tools');
  await expect(page.getByRole('link', { name: '色彩索引' })).toBeVisible();
  await expect(page.getByRole('link', { name: '工具', exact: true })).toHaveAttribute(
    'aria-current',
    'page'
  );
  await page.goto('/projects?category=web&page=25&ref=example');
  await expect(page.getByText('No projects on this page.')).toBeVisible();
  await expect(page.getByText('No projects match this category.')).toHaveCount(0);
  await page.getByRole('link', { name: 'First page', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\?category=web&ref=example$/);
  await expect(page.getByRole('link', { name: 'Field Notes' })).toBeVisible();
  await page.goto('/projects?category=removed');
  await expect(page.getByText('No projects match this category.')).toBeVisible();
  const pagination = page.locator('.ui-portfolio-project-pagination');
  await pagination.getByRole('link', { name: 'All projects', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('link', { name: 'Color Index' })).toBeVisible();
});

test('Selected work keeps its URL parameters and fragment across filter changes', async ({
  page,
}) => {
  await page.goto('/?category=tools&ref=example#work');
  const work = page.getByRole('region', { name: 'Selected work' });
  await expect(work.getByRole('link', { name: 'Color Index' })).toBeVisible();
  await expect(work.getByRole('link', { name: 'Web', exact: true })).toHaveAttribute(
    'href',
    '/?category=web&ref=example#work'
  );
  await work.getByRole('link', { name: 'Web', exact: true }).click();
  await expect(page).toHaveURL(/\?category=web&ref=example#work$/);
  await expect(work.getByRole('link', { name: 'Field Notes' })).toBeVisible();
  await page.goBack();
  await expect(work.getByRole('link', { name: 'Color Index' })).toBeVisible();
});

test('uses the smaller registered cover on narrow screens and supports single-image covers', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/projects');
  const image = page
    .locator('.ui-project-card')
    .filter({ has: page.getByRole('link', { name: 'Field Notes', exact: true }) })
    .getByRole('img', { name: 'A quiet lake among hills' });
  await expect(image).toHaveAttribute('srcset', /lake-thumbnail\.jpg 420w,.+lake\.jpg 960w/u);
  await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() => image.evaluate((element) => (element as HTMLImageElement).currentSrc))
    .toContain('lake-thumbnail.jpg');
  const allowed = await request.get(
    '/api/projects/media/field-notes?key=samples%2Fportfolio%2Flake-thumbnail.jpg'
  );
  expect(allowed.headers()['content-type']).toBe('image/jpeg');
  expect(
    (
      await request.get(
        '/api/projects/media/color-index?key=samples%2Fportfolio%2Flake-thumbnail.jpg'
      )
    ).status()
  ).toBe(404);
  await page.getByRole('link', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL('/projects?page=2');
  const legacy = page
    .locator('.ui-project-card')
    .filter({ has: page.getByRole('link', { name: 'Paper Trail', exact: true }) })
    .getByRole('img', { name: 'An open sketchbook and color studies on a worktable' });
  await expect(legacy).toHaveAttribute('src', /worktable\.jpg/u);
  await expect(legacy).not.toHaveAttribute('srcset');
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

test('keeps all four pages readable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/?lang=zh');
  const nav = page.getByRole('navigation', { name: '主导航' });
  for (const { label, title } of [
    { label: '首页', title: '用心做的小项目。' },
    { label: '关于', title: '关于' },
    { label: '项目', title: '项目' },
    { label: '联系', title: '联系' },
  ]) {
    await nav.getByRole('link', { name: label, exact: true }).click();
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    if (label === '项目') await expect(page.getByRole('link', { name: '野外笔记' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
  }
  await expect(page.getByRole('textbox', { name: '留言' })).toBeVisible();
});

test('shows card skeletons, scrolls long category rows and keeps the Mono header in view', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 780 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const additionalCategories = Array.from({ length: 8 }, (_, index) => ({
    id: 'sample-category-' + index,
    label: 'Sample category ' + index,
    count: 0,
  }));
  await page.route('**/api/projects/categories?*', (route) =>
    replacePortfolioPayload(route, additionalCategories)
  );

  let releaseProjects = () => {};
  const responseGate = new Promise<void>((resolve) => {
    releaseProjects = resolve;
  });
  await page.route('**/api/projects?*', async (route) => {
    await responseGate;
    await route.continue();
  });
  try {
    await page.goto('/');
    const work = page.getByRole('region', { name: 'Selected work' });
    await expect(work.getByRole('status').filter({ hasText: 'Loading projects…' })).toBeAttached();
    const skeleton = work.locator('.ui-portfolio-skeleton-cover').first();
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveCSS('animation-name', 'none');
    releaseProjects();
    await expect(work.getByRole('link', { name: 'Field Notes' })).toBeVisible();
    await expect(skeleton).toHaveCount(0);

    await page.evaluate(() => window.scrollTo(0, 320));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const header = await page.getByRole('banner').boundingBox();
    expect(header?.y).toBeCloseTo(0);

    const filters = work.getByRole('group', { name: 'Category', exact: true });
    expect(await filters.evaluate((track) => track.scrollWidth > track.clientWidth)).toBe(true);
    await filters.hover();
    await page.mouse.wheel(800, 0);
    await expect.poll(() => filters.evaluate((track) => track.scrollLeft)).toBeGreaterThan(0);
    const lastFilter = filters.getByRole('link', { name: 'Sample category 7', exact: true });
    await lastFilter.click();
    await expect(lastFilter).toHaveAttribute('aria-current', 'page');
    await expect(work.getByText('No projects match this category.')).toBeVisible();
  } finally {
    releaseProjects();
  }
});

test('reveals the URL category in a 320px rail across history and resize', async ({ page }) => {
  const categories = Array.from({ length: 12 }, (_, index) => ({
    id: 'sample-category-' + index,
    label: 'Sample category ' + index,
    count: 0,
  }));
  await page.route('**/api/projects/categories?*', (route) =>
    replacePortfolioPayload(route, categories)
  );
  await page.route('**/api/projects?*', (route) =>
    replacePortfolioPayload(route, { projects: [], hasMore: false })
  );
  await page.setViewportSize({ width: 320, height: 460 });
  await page.goto('/?category=sample-category-11#work');

  const rail = page.getByRole('group', { name: 'Category', exact: true });
  const selected = rail.getByRole('link', { name: 'Sample category 11', exact: true });
  const expectRevealed = async () => {
    await expect(selected).toHaveAttribute('aria-current', 'page');
    await expect
      .poll(() =>
        rail.evaluate((track) => {
          const active = track.querySelector('a[aria-current="page"]')?.getBoundingClientRect();
          const viewport = track.getBoundingClientRect();
          return Boolean(active && active.left >= viewport.left && active.right <= viewport.right);
        })
      )
      .toBe(true);
    expect(await rail.evaluate((track) => track.scrollLeft)).toBeGreaterThan(0);
  };
  await expectRevealed();
  await expect(selected).not.toBeFocused();

  const all = rail.getByRole('link', { name: 'All projects', exact: true });
  await all.click();
  await expect(all).toHaveAttribute('aria-current', 'page');
  await page.goBack();
  await expectRevealed();
  await page.goForward();
  await expect(all).toHaveAttribute('aria-current', 'page');
  await page.goBack();
  await expectRevealed();

  await rail.evaluate((track) => {
    track.scrollLeft = 0;
  });
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.setViewportSize({ width: 321, height: 460 });
  await expectRevealed();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
});

for (const failure of [
  {
    route: 'projects/categories',
    message: 'Categories could not be loaded.',
    loading: 'Loading categories…',
  },
  { route: 'projects', message: 'Projects could not be loaded.', loading: 'Loading projects…' },
] as const) {
  test(`allows the other region to display and retries only ${failure.route}`, async ({ page }) => {
    let failedRequests = 0;
    let successfulRequests = 0;
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/' + failure.route + '?*', async (route) => {
      failedRequests++;
      if (failedRequests === 1) {
        await gate;
        await route.fulfill({ status: 503, json: { code: 'data-source-unavailable' } });
      } else {
        await route.continue();
      }
    });
    const other = failure.route === 'projects' ? 'projects/categories' : 'projects';
    await page.route('**/api/' + other + '?*', async (route) => {
      successfulRequests++;
      await route.continue();
    });
    try {
      await page.goto('/');
      const work = page.getByRole('region', { name: 'Selected work' });
      const categories = work.getByRole('group', { name: 'Category', exact: true });
      const item = work.getByRole('link', { name: 'Field Notes' });
      await expect(failure.route === 'projects' ? categories : item).toBeVisible();
      await expect(work.getByText(failure.loading, { exact: true })).toBeAttached();
      release();
      await expect(work.getByText(failure.message)).toBeVisible();
      await expect(failure.route === 'projects' ? categories : item).toBeVisible();
      await work.getByRole('button', { name: 'Try again' }).click();
      await expect(categories).toBeVisible();
      await expect(item).toBeVisible();
      expect(failedRequests).toBe(2);
      expect(successfulRequests).toBe(1);
    } finally {
      release();
    }
  });
}
