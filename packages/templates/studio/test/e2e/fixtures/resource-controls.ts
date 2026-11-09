import type { Page } from '@playwright/test';
export async function openPagePanel(page: Page, name: string): Promise<void> {
  await page.locator('.ui-studio-resource-manager').getByRole('tab', { name, exact: true }).click();
}
export async function selectStudioTheme(
  page: Page,
  value: 'light' | 'dark' | 'system'
): Promise<void> {
  if ((await page.locator('.ui-studio-shell').getAttribute('data-theme')) === value) return;
  const labels = { light: 'Light', dark: 'Dark', system: 'System' } as const;
  await page.locator('.ui-studio-topbar .ui-theme-switcher-trigger').click();
  await page
    .locator('.ui-studio-topbar')
    .getByRole('button', { name: labels[value], exact: true })
    .click();
}
