import { expect, type Page } from '@playwright/test';
import { test } from './fixtures/studio';
import { applyDocument } from './fixtures/document';

async function chooseTheme(page: Page, name: string) {
  await page.locator('.ui-studio-topbar .ui-theme-switcher-trigger').click();
  await page.locator('.ui-studio-topbar').getByRole('button', { name, exact: true }).click();
}

test('compact Studio keeps readable panels, fields and actions in both palettes', async ({
  page,
}) => {
  test.skip(process.env.UI_THEME_POLICY === 'light' || process.env.UI_THEME_POLICY === 'dark');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/demo');
  const shell = page.locator('.ui-studio-shell');
  const panel = page.getByRole('region', { name: 'Selected record', exact: true });
  const title = page.getByLabel('Title', { exact: true });
  const action = page.getByRole('button', { name: 'Apply changes', exact: true });
  const palettes = [
    {
      name: 'Light',
      mode: 'light',
      background: 'rgb(247, 247, 248)',
      surface: 'rgb(255, 255, 255)',
      text: 'rgb(23, 23, 23)',
    },
    {
      name: 'Dark',
      mode: 'dark',
      background: 'rgb(22, 23, 26)',
      surface: 'rgb(30, 32, 36)',
      text: 'rgb(245, 245, 245)',
    },
  ];
  for (const { name, mode, background, surface, text } of palettes) {
    await chooseTheme(page, name);
    await expect(shell).toHaveAttribute('data-theme', mode);
    await expect(shell).toHaveCSS('background-color', background);
    await expect(panel).toHaveCSS('background-color', surface);
    await expect(action).toHaveCSS('color', text);
    const properties = await action.evaluate((node) =>
      getComputedStyle(node)
        .transitionProperty.split(',')
        .map((part) => part.trim())
    );
    expect(properties).not.toContain('background');
    expect(properties).not.toContain('background-color');
    expect(properties).not.toContain('color');
    await expect(page.locator('.ui-studio-topbar')).toHaveCSS('height', '52px');
    expect((await title.boundingBox())?.height).toBe(32);
    expect((await action.boundingBox())?.height).toBe(32);
    await title.fill('A compact, editable record');
    await action.click();
    await expect(
      page.getByRole('button', { name: 'A compact, editable record', exact: true })
    ).toBeVisible();
    await action.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(action).toBeFocused();
    await expect(action).toHaveCSS('outline-style', 'solid');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  }
});

test('system palette follows OS changes without rebuilding the workspace', async ({ page }) => {
  test.skip(process.env.UI_THEME_POLICY === 'light' || process.env.UI_THEME_POLICY === 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/demo');
  const shell = page.locator('.ui-studio-shell');
  await expect(shell).toHaveAttribute('data-theme', 'system');
  await expect(shell).toHaveCSS('background-color', 'rgb(247, 247, 248)');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(shell).toHaveCSS('background-color', 'rgb(22, 23, 26)');
  await expect(page.getByLabel('Title', { exact: true })).toHaveCSS('color', 'rgb(245, 245, 245)');
});

for (const width of [320, 768]) {
  test(`compact controls retain touch space and modal focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await page.goto('/demo');
    const action = page.getByRole('button', { name: 'Apply changes', exact: true });
    expect((await action.boundingBox())?.height).toBeGreaterThanOrEqual(40);
    const trigger = page.getByRole('button', { name: 'Open navigation' });
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Demo', exact: true })).toBeVisible();
    await expect(dialog.locator('.ui-studio-navigation-group a').first()).toHaveCSS(
      'transition-duration',
      '0s'
    );
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  });
}

test('compact editing controls and confirmation use Studio styling without changing actual preview', async ({
  page,
}) => {
  await page.goto('/demo/pages/new');
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeVisible();
  await applyDocument(page);
  const publish = page.getByRole('button', { name: 'Publish', exact: true });
  expect((await publish.boundingBox())?.height).toBeLessThanOrEqual(40);
  await publish.click();
  const dialog = page.getByRole('dialog', { name: 'Publish this snapshot?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS('border-radius', '5px');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(publish).toBeFocused();
  await page.getByRole('button', { name: 'Refresh actual preview' }).click();
  const frame = page.frameLocator('iframe[title="Actual content page"]');
  await expect(
    frame.getByRole('heading', { name: 'Neutral bound title', exact: true })
  ).toBeVisible();
  expect(
    await frame
      .locator('main')
      .evaluate((node) => getComputedStyle(node).getPropertyValue('--ui-studio-surface'))
  ).toBe('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
