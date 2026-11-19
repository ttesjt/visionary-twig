import { expect, test } from '@playwright/test';

test('the optional entry applies Mono colors and compact controls', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/?layout');
  const body = page.locator('body');
  const action = page.getByRole('button', { name: 'Example action' });
  await expect(body).toHaveCSS('background-color', 'rgb(250, 250, 250)');
  await expect(action).toHaveCSS('border-radius', '8px');

  await page.goto('/?layout&mono');
  await expect(body).toHaveCSS('background-color', 'rgb(250, 250, 249)');
  await expect(body).toHaveCSS('font-family', /Inter/);
  await expect(action).toHaveCSS('border-radius', '3px');
});

test('Mono follows explicit and system color modes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/?layout&mono');
  const root = page.locator('html');
  const body = page.locator('body');
  await expect(body).toHaveCSS('background-color', 'rgb(20, 20, 20)');
  await expect(body).toHaveCSS('color', 'rgb(241, 241, 239)');

  await root.evaluate((element) => element.setAttribute('data-theme', 'light'));
  await expect(body).toHaveCSS('background-color', 'rgb(250, 250, 249)');
  await expect(body).toHaveCSS('color', 'rgb(27, 27, 27)');

  await root.evaluate((element) => element.setAttribute('data-theme', 'system'));
  await expect(body).toHaveCSS('background-color', 'rgb(20, 20, 20)');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(body).toHaveCSS('background-color', 'rgb(250, 250, 249)');

  await root.evaluate((element) => element.setAttribute('data-theme', 'dark'));
  await expect(body).toHaveCSS('background-color', 'rgb(20, 20, 20)');
});

test('Neutral overrides the opted-in Mono appearance without changing the color mode', async ({
  page,
}) => {
  await page.goto('/?layout&mono');
  const root = page.locator('html');
  const action = page.getByRole('button', { name: 'Example action' });
  await root.evaluate((element) => {
    element.dataset.preset = 'neutral';
    element.dataset.theme = 'dark';
  });
  await expect(action).toHaveCSS('border-radius', '8px');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(17, 17, 17)');

  await root.evaluate((element) => (element.dataset.preset = 'mono'));
  await expect(action).toHaveCSS('border-radius', '3px');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(20, 20, 20)');
  await expect(root).toHaveAttribute('data-theme', 'dark');
});

test('custom CSS tokens override imported Mono without a preset lifecycle', async ({ page }) => {
  await page.goto('/?layout&mono');
  await expect(page.locator('html')).not.toHaveAttribute('data-preset');
  await expect(page.locator('html')).not.toHaveAttribute('data-style-preview');
  await page.addStyleTag({
    content: ':root { --my-site-canvas: #203040; --ui-color-canvas: var(--my-site-canvas); }',
  });
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(32, 48, 64)');
});
