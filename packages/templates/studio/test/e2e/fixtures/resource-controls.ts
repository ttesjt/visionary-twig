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
  const switcher = page.locator('.ui-studio-appearance-switcher:visible');
  await switcher.locator('.ui-theme-switcher-trigger').click();
  await switcher.getByRole('button', { name: labels[value], exact: true }).click();
}
