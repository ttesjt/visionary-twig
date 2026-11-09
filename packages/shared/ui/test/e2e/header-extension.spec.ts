import { expect, test } from '@playwright/test';

test('real CSS enters and exits without leaving retained or interactive hidden content', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const surface = page.locator('.ui-site-header-extension');
  const duration = await surface.evaluate(
    (element) => getComputedStyle(element).transitionDuration
  );
  expect(new Set(duration.split(', '))).toEqual(
    new Set([testInfo.project.name === 'reduced-motion' ? '0s' : '0.3s'])
  );
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await expect(surface).toHaveAttribute('data-state', 'open');
  await expect(page.getByRole('button', { name: 'First action' })).toBeVisible();
  await expect(surface).not.toHaveAttribute('inert');
  await page.getByRole('button', { name: 'Hide', exact: true }).click();
  await expect(surface).toHaveAttribute('inert');
  await expect(surface).toHaveAttribute('data-state', 'closed');
  await expect(page.getByText('First action')).toHaveCount(0);
});

test('replacement and native animation cancellation recover before unmount', async ({ page }) => {
  await page.goto('/');
  const surface = page.locator('.ui-site-header-extension');
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await expect(surface).toHaveAttribute('data-state', 'open');
  await page.getByRole('button', { name: 'Hide', exact: true }).click();
  await surface.evaluate((element) =>
    element.getAnimations().forEach((animation) => animation.cancel())
  );
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(surface).toHaveAttribute('data-state', 'open');
  await expect(page.getByRole('button', { name: 'Second action' })).toBeVisible();
  await expect(page.getByText('First action')).toHaveCount(0);
  await page.getByRole('button', { name: 'Unmount', exact: true }).click();
  await expect(surface).toHaveCount(0);
});
