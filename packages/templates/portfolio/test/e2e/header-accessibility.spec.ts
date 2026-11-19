import { test } from '@playwright/test';
import { assertSkipNavigation } from './fixtures/header';
for (const { url, label } of [
  { url: '/contact', label: 'Skip to main content' },
  { url: '/contact?lang=zh', label: '跳到正文' },
]) {
  test('skips navigation by keyboard at ' + url, async ({ page }) => {
    await assertSkipNavigation(page, url, label);
  });
}
