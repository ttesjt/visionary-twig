import { expect } from '@playwright/test';
import { test } from '../../../../../test/e2e/fixtures/portfolio';
import {
  assertPreparedHeader,
  assertSkipNavigation,
} from '../../../../../test/e2e/fixtures/header';
import { openPreferences } from '../../../../../test/e2e/fixtures/theme';
import { APPEARANCE_PRESETS, APPEARANCE_STORAGE_KEY } from '../../policy';
for (const appearance of APPEARANCE_PRESETS) {
  test('previews the prepared Header with ' + appearance, async ({ page }) => {
    await page.addInitScript(({ key, appearance }) => localStorage.setItem(key, appearance), {
      key: APPEARANCE_STORAGE_KEY,
      appearance,
    });
    await assertPreparedHeader(page);
    await expect(page.locator('html')).toHaveAttribute('data-style-preview', appearance);
    await openPreferences(page);
    const picker = page.getByRole('combobox', { name: 'Appearance' });
    const language = page.getByRole('combobox', { name: 'Language' });
    await expect(picker).toBeInViewport({ ratio: 1 });
    const label = await page.getByText('Appearance', { exact: true }).boundingBox();
    const bounds = await picker.boundingBox();
    if (!label || !bounds) throw new Error('Missing preview field');
    expect(label.y + label.height).toBeLessThan(bounds.y);
    await language.focus();
    await page.keyboard.press('Tab');
    await expect(picker).toBeFocused();
  });
  for (const { url, label } of [
    { url: '/contact', label: 'Skip to main content' },
    { url: '/contact?lang=zh', label: '跳到正文' },
  ])
    test('previews keyboard skip with ' + appearance + ' at ' + url, async ({ page }) => {
      await page.addInitScript(({ key, appearance }) => localStorage.setItem(key, appearance), {
        key: APPEARANCE_STORAGE_KEY,
        appearance,
      });
      await assertSkipNavigation(page, url, label);
    });
}
