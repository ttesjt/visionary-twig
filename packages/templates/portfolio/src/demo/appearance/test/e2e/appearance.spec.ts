import { PROJECT_DEMO_ENABLED } from '../../../../site/project-data';
import { expect } from '@playwright/test';
import { test } from '../../../../../test/e2e/fixtures/portfolio';
import { APPEARANCE_STORAGE_KEY } from '../../policy';
import { THEME_STORAGE_KEY } from '../../../../site/theme';
import {
  holdHydration,
  hydrationErrors,
  openPreferences,
  THEME_CANVAS,
} from '../../../../../test/e2e/fixtures/theme';

test('switches appearance independently of color mode and preserves it across routes', async ({
  page,
}) => {
  test.skip(process.env.UI_THEME_POLICY === 'light' || process.env.UI_THEME_POLICY === 'dark');
  await page.goto('/');
  const root = page.locator('html');
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  await expect(root).toHaveAttribute('data-style-preview', 'mono');
  const work = page.getByRole('region', { name: 'Selected work' });
  await expect(work).toBeVisible();
  await theme.selectOption('dark');

  await openPreferences(page);
  await page.getByRole('combobox', { name: 'Appearance', exact: true }).selectOption('neutral');
  await expect(root).toHaveAttribute('data-style-preview', 'neutral');
  await expect(work).toBeVisible();
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await theme.selectOption('light');
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(root).toHaveAttribute('data-style-preview', 'neutral');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'About' })
    .click();
  await expect(page.getByRole('heading', { name: 'About', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Appearance', exact: true })).toHaveValue(
    'neutral'
  );

  await page.getByRole('combobox', { name: 'Appearance', exact: true }).selectOption('mono');
  await expect(root).toHaveAttribute('data-style-preview', 'mono');
  await expect(root).toHaveAttribute('data-theme', 'light');
});

test('restores Neutral before hydration, without a Mono first paint', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript((key) => localStorage.setItem(key, 'neutral'), APPEARANCE_STORAGE_KEY);
  const held = await holdHydration(page);
  const errors = hydrationErrors(page);
  try {
    await page.goto('/', { waitUntil: 'commit' });
    await openPreferences(page);
    const appearance = page.getByRole('combobox', { name: 'Appearance', exact: true });
    await expect(appearance).toBeDisabled();
    await expect(page.locator('html')).toHaveAttribute('data-style-preview', 'neutral');
    await expect.poll(() => held.paints[0]).toBe('light light rgb(250, 250, 250)');
    await held.release();
    await expect(appearance).toHaveValue('neutral');
    expect(errors).toEqual([]);
  } finally {
    await held.release();
  }
});

test('preserves appearance and color scheme when switching languages', async ({ page }) => {
  test.skip(process.env.UI_THEME_POLICY === 'light' || process.env.UI_THEME_POLICY === 'dark');
  const errors = hydrationErrors(page);
  await page.goto('/about?sample=1#details');
  const root = page.locator('html');

  await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('dark');
  await openPreferences(page);
  await page.getByRole('combobox', { name: 'Appearance', exact: true }).selectOption('neutral');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('zh');
  await expect(page).toHaveURL(/\/about\?sample=1&lang=zh#details$/);
  await expect(root).toHaveAttribute('lang', 'zh');
  await openPreferences(page);
  await expect(page.getByRole('heading', { level: 1, name: '关于' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: '外观', exact: true })).toHaveValue('neutral');
  await expect(root).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('combobox', { name: '语言', exact: true }).selectOption('en');
  await expect(page).toHaveURL(/\/about\?sample=1#details$/);
  await expect(root).toHaveAttribute('lang', 'en');
  await openPreferences(page);
  await expect(page.getByRole('combobox', { name: 'Appearance', exact: true })).toHaveValue(
    'neutral'
  );
  await expect(root).toHaveAttribute('data-theme', 'dark');
  expect(errors).toEqual([]);
});

test('fixed theme policy still permits switching appearance', async ({ page }) => {
  const scheme = process.env.UI_THEME_POLICY;
  if (scheme !== 'light' && scheme !== 'dark') {
    test.skip(true, 'Runs in the fixed theme matrix.');
    return;
  }

  const opposite = scheme === 'light' ? 'dark' : 'light';
  await page.emulateMedia({ colorScheme: opposite });
  await page.addInitScript(({ key, preference }) => localStorage.setItem(key, preference), {
    key: THEME_STORAGE_KEY,
    preference: opposite,
  });
  await page.goto('/');
  const root = page.locator('html');
  await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toHaveCount(0);
  await expect(root).toHaveAttribute('data-theme', scheme);
  await expect(page.locator('body')).toHaveCSS('background-color', THEME_CANVAS[scheme]);

  await openPreferences(page);
  await page.getByRole('combobox', { name: 'Appearance', exact: true }).selectOption('neutral');
  await expect(root).toHaveAttribute('data-style-preview', 'neutral');
  await expect(root).toHaveAttribute('data-theme', scheme);

  await page.getByRole('combobox', { name: 'Appearance', exact: true }).selectOption('mono');
  await expect(root).toHaveAttribute('data-style-preview', 'mono');
  await expect(root).toHaveAttribute('data-theme', scheme);
});

test('preview changes never unmount, reload or gate the project collection', async ({ page }) => {
  test.skip(!PROJECT_DEMO_ENABLED, 'Demo data was not selected.');
  let listRequests = 0;
  await page.route('**/api/projects?*', async (route) => {
    listRequests++;
    await route.continue();
  });
  await page.addInitScript((key) => localStorage.setItem(key, 'neutral'), APPEARANCE_STORAGE_KEY);
  await page.goto('/?category=tools#work');
  const work = page.getByRole('region', { name: 'Selected work' });
  const card = work.getByRole('link', { name: 'Color Index', exact: true });
  await expect(card).toBeVisible();
  const original = await card.elementHandle();
  if (!original) throw new Error('Missing project node');
  const count = listRequests;
  for (const preview of ['mono', 'neutral']) {
    await openPreferences(page);
    await page.getByRole('combobox', { name: 'Appearance', exact: true }).selectOption(preview);
    await expect(page.locator('html')).toHaveAttribute('data-style-preview', preview);
    await expect(card).toBeVisible();
    expect(await original.evaluate((element) => element.isConnected)).toBe(true);
    expect(listRequests).toBe(count);
    await expect(page).toHaveURL(/category=tools#work$/);
  }
});
