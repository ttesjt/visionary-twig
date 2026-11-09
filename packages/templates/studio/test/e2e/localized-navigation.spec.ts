import prepared from '../../.generated/text/catalog.json' with { type: 'json' };
import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { TEXT_LOCALES, DEFAULT_TEXT_LOCALE } from '../../src/site/text';

// Exercise every configured language, including additional languages in generated hosts.
for (const locale of TEXT_LOCALES) {
  const labels = prepared.locales[locale].main;
  const entry = '/' + locale;
  const prefix = locale === DEFAULT_TEXT_LOCALE ? '' : entry;
  test(`Studio navigation keeps the ${locale} workspace through publication, editing and preview`, async ({
    page,
  }) => {
    await page.goto(entry + '/pages');
    await expect(page).toHaveURL((url) => url.pathname === prefix + '/demo/pages');

    await page.goto(entry + '/demo/upload');
    const title = page.getByRole('textbox', {
      name: labels['workspace.demo.fields.title'],
      exact: true,
    });
    const name = 'Field notes ' + locale;
    await title.fill(name);
    await page
      .getByRole('button', { name: labels['workspace.demo.upload.publish'], exact: true })
      .click();
    await expect(page).toHaveURL((url) => url.pathname === prefix + '/demo');
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible();
    await expect(title).toHaveValue(name);

    const pagesLink = page
      .locator('.ui-studio-sidebar')
      .getByRole('link', { name: labels['workspace.pages.pages.title'], exact: true });
    await expect(pagesLink).toHaveAttribute('href', prefix + '/demo/pages');
    await page
      .getByRole('link', { name: labels['workspace.demo.pages.createForItem'], exact: true })
      .click();
    await expect(page).toHaveURL(
      (url) => url.pathname === prefix + '/demo/pages/new' && !!url.searchParams.get('item')
    );
    const item = new URL(page.url()).searchParams.get('item');
    await page
      .getByRole('tab', { name: labels['workspace.demo.pages.controls.files'], exact: true })
      .click();
    await page.getByRole('button', { name: labels['host.example'], exact: true }).click();
    const frame = page.locator('.ui-studio-preview iframe');
    await expect(frame).toHaveAttribute('src', new RegExp('^' + prefix + '/preview/'));
    await expect(frame.contentFrame().locator('html')).toHaveAttribute('lang', locale);
    await page
      .getByRole('link', { name: labels['workspace.demo.pages.editing.editJson'], exact: true })
      .click();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === prefix + '/demo/pages/new/json' && url.searchParams.get('item') === item
    );

    await page
      .getByRole('link', { name: labels['workspace.demo.pages.editing.back'], exact: true })
      .click();
    await expect(page).toHaveURL((url) => url.pathname === prefix + '/demo/pages/new');
  });
}
