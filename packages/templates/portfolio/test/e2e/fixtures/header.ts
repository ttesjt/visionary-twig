import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { appConfigSchema } from '../../../src/site/config-schema';
import { SITE_ROUTES } from '../../../src/site/routes';
const config = appConfigSchema.parse(
  JSON.parse(readFileSync(new URL('../../../.generated/config/app.json', import.meta.url), 'utf8'))
);
const { layout = 'full-width', brandImage, hiddenNavigation = [] } = config.header ?? {};
const navigationLabels = { home: 'Home', about: 'About', projects: 'Projects', contact: 'Contact' };
export async function assertPreparedHeader(page: Page) {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  const header = page.getByRole('banner');
  await expect(header).toHaveAttribute('data-layout', layout);
  const brand = header.getByRole('link').first();
  await expect(brand).toHaveAccessibleName('Portfolio');
  await expect(brand).toHaveAttribute('href', '/');
  const brandLabel = brand.getByText('Portfolio', { exact: true });
  expect(await brandLabel.evaluate((label) => label.scrollWidth <= label.clientWidth)).toBe(true);
  const image = brand.locator('img');
  if (brandImage) {
    await expect(image).toHaveAttribute('src', brandImage);
    await expect
      .poll(() =>
        image.evaluate((element) =>
          element instanceof HTMLImageElement ? element.naturalWidth : 0
        )
      )
      .toBeGreaterThan(0);
  } else {
    await expect(image).toHaveCount(0);
  }

  const navigation = header.getByRole('navigation', { name: 'Main navigation' });
  for (const [id, name] of Object.entries(navigationLabels)) {
    const hidden = hiddenNavigation.some((item) => item === id);
    await expect(navigation.getByRole('link', { name, exact: true })).toHaveCount(hidden ? 0 : 1);
  }

  const bounds = await header.boundingBox();
  if (!bounds) throw new Error('Expected a visible Header.');
  if (layout === 'floating') {
    expect(bounds.x).toBeGreaterThan(0);
    expect(bounds.x + bounds.width).toBeLessThan(320);
    await expect(header).toHaveCSS('position', 'sticky');
  } else {
    expect(bounds.x).toBe(0);
    expect(bounds.width).toBe(320);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);

  const preferences = header.getByText('Preferences', { exact: true }).locator('..');
  await preferences.focus();
  await page.keyboard.press('Enter');
  const language = header.getByRole('combobox', { name: 'Language' });
  await expect(language).toBeInViewport({ ratio: 1 });
  const labelBounds = await header.getByText('Language', { exact: true }).boundingBox();
  const selectBounds = await language.boundingBox();
  if (!labelBounds || !selectBounds) throw new Error('Expected a visible language field.');
  expect(labelBounds.y + labelBounds.height).toBeLessThan(selectBounds.y);
  await page.keyboard.press('Tab');
  await expect(language).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(language).toBeHidden();
  await expect(preferences).toBeFocused();

  if (layout === 'floating') {
    await page.setViewportSize({ width: 320, height: 420 });
    await page.goto(SITE_ROUTES.contact);
    await page.evaluate(() => window.scrollTo(0, 160));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const scrolled = await header.boundingBox();
    expect(scrolled?.y).toBeCloseTo(bounds.y);
  }

  for (const id of hiddenNavigation) {
    const response = await page.goto(SITE_ROUTES[id]);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('main')).toBeVisible();
  }
}
export async function assertSkipNavigation(page: Page, url: string, label: string) {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(url);
  const main = page.getByRole('main');
  const skip = page.getByRole('link', { name: label, exact: true });
  await expect(main).toHaveCount(1);
  await expect(skip).not.toBeInViewport();
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(main).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(main.getByRole('textbox').first()).toBeFocused();
}
