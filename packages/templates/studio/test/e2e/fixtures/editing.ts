import { expect, type Page } from '@playwright/test';
import { checkedProject } from './project';
const sectionLabels = {
  document: 'Layout document',
  catalogs: 'Language catalogs',
  context: 'Context',
} as const;
export async function returnToPage(page: Page): Promise<void> {
  const back = page.getByRole('link', { name: 'Back to page', exact: true });
  if (await back.isVisible()) {
    await back.click();
    await expect(page).not.toHaveURL(/\/(?:json|puck)(?:[?#].*)?$/u);
  }
  await expect(page.getByRole('region', { name: 'Page controls', exact: true })).toBeVisible();
}
export async function openJson(
  page: Page,
  section: keyof typeof sectionLabels = 'document'
): Promise<import('@playwright/test').Locator> {
  if (!new URL(page.url()).pathname.endsWith('/json')) {
    await returnToPage(page);
    await page.getByRole('link', { name: 'Edit JSON', exact: true }).click();
    await expect(page).toHaveURL(/\/json(?:[?#].*)?$/u);
  }
  await page.getByRole('tab', { name: 'JSON', exact: true }).click();
  await page.getByLabel('JSON section', { exact: true }).selectOption(section);
  return page.getByRole('textbox', { name: sectionLabels[section], exact: true });
}
export async function applySection(
  page: Page,
  section: keyof typeof sectionLabels,
  value: unknown
): Promise<void> {
  const input = await openJson(page, section);
  await input.fill(JSON.stringify(value));
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByText('JSON matches the working copy.', { exact: true })).toBeVisible();
  await returnToPage(page);
}
export async function readSection(
  page: Page,
  section: keyof typeof sectionLabels
): Promise<string> {
  const input = await openJson(page, section);
  const text = await input.inputValue();
  await returnToPage(page);
  return text;
}
export async function openPuck(page: Page): Promise<void> {
  if (!new URL(page.url()).pathname.endsWith('/puck')) {
    await returnToPage(page);
    await page.getByRole('link', { name: 'Puck · experimental', exact: true }).click();
    await expect(page).toHaveURL(/\/puck(?:[?#].*)?$/u);
  }
  await expect(page.getByRole('note')).toContainText('not production-ready');
  await expect(page.getByRole('region', { name: 'Page editor' })).toBeVisible();
}
export async function downloadProject(page: Page) {
  await returnToPage(page);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save As', exact: true }).click();
  const stream = await (await downloading).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    const value: unknown = chunk;
    if (!(value instanceof Uint8Array)) throw new Error('Expected binary download chunk.');
    chunks.push(Buffer.from(value));
  }
  return checkedProject(Buffer.concat(chunks).toString('utf8'));
}
