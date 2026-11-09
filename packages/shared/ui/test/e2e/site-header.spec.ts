import { expect, test } from '@playwright/test';

for (const position of ['flow', 'sticky']) {
  test(`header uses ${position} positioning with the shared styles`, async ({ page }) => {
    await page.goto(`/?layout&position=${position}`);
    const header = page.getByRole('banner');
    const sticky = position === 'sticky';
    if (sticky) await expect(header).toHaveCSS('position', 'sticky');
    await page.evaluate(() => window.scrollTo(0, 400));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
    const edge = () => header.evaluate((element) => element.getBoundingClientRect().bottom);
    if (sticky) await expect.poll(edge).toBeGreaterThan(0);
    else await expect.poll(edge).toBeLessThan(0);
  });
}

test('the mobile menu uses host-supplied navigation and action labels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await page.goto('/?layout');
  const open = page.getByRole('button', { name: 'Menu' });
  await open.click();
  const menu = page.getByRole('dialog', { name: 'Pages' });
  await expect(
    menu.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Docs' })
  ).toHaveAttribute('href', '/docs');
  await expect(
    menu.getByRole('navigation', { name: 'Utilities' }).getByRole('link', { name: 'Help' })
  ).toHaveAttribute('href', '/help');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(open).toBeFocused();
});
