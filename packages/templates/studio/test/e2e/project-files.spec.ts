import { expect } from '@playwright/test';
import { test } from './fixtures/studio';
import { openPagePanel } from './fixtures/resource-controls';
import { downloadProject, openPuck, openJson, applySection } from './fixtures/editing';
import { project, checkedProject, catalogValue } from './fixtures/project';
async function openProject(page: import('@playwright/test').Page) {
  await openPagePanel(page, 'Files');
  await page.getByLabel('Open JSON file', { exact: true }).setInputFiles({
    name: 'neutral.studio.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
}
test('catalog edits, language changes and key rename preserve bindings and share project undo/redo', async ({
  page,
}) => {
  await page.goto('/demo/pages/new');
  await openProject(page);
  await openPagePanel(page, 'Copy & languages');
  await expect(page.getByRole('region', { name: 'Project catalogs', exact: true })).toHaveCount(1);
  await expect(
    page.frameLocator('iframe[title="Actual content page"]').getByRole('heading').first()
  ).toContainText('Quiet discoveries');
  await page
    .locator('.ui-studio-key-list button')
    .filter({ hasText: /^hero.title$/ })
    .click();
  await page
    .getByRole('textbox', { name: 'Catalog value', exact: true })
    .fill('A different discovery');
  await expect(
    page.frameLocator('iframe[title="Actual content page"]').getByRole('heading').first()
  ).toContainText('A different discovery');
  await page.getByRole('combobox', { name: 'Editing language', exact: true }).selectOption('zh');
  await expect(
    page.frameLocator('iframe[title="Actual content page"]').getByRole('heading').first()
  ).toContainText('安静的发现');
  await page.getByRole('textbox', { name: 'Catalog key', exact: true }).fill('intro.title');
  await page.getByRole('button', { name: 'Rename key', exact: true }).click();
  let raw = await downloadProject(page);
  expect(raw.document.bindings?.[0]?.sourcePath).toEqual(['copy', 'intro', 'title']);
  expect(catalogValue(raw, 'en', ['intro', 'title'])).toBe('A different discovery');
  expect(catalogValue(raw, 'zh', ['intro', 'title'])).toBe('安静的发现');
  await openJson(page);
  await page.getByRole('button', { name: 'undo', exact: true }).click();
  raw = await downloadProject(page);
  expect(raw.document.bindings?.[0]?.sourcePath).toEqual(['copy', 'hero', 'title']);
  await openJson(page);
  await page.getByRole('button', { name: 'redo', exact: true }).click();
  raw = await downloadProject(page);
  expect(raw.document.bindings?.[0]?.sourcePath).toEqual(['copy', 'intro', 'title']);
  await openPagePanel(page, 'Copy & languages');
  await page.getByRole('textbox', { name: 'Catalog key', exact: true }).fill('intro.title');
  await expect(page.getByRole('button', { name: 'Delete key', exact: true })).toBeDisabled();
});
test('bound fields edit their actual language catalog and explicit unbind freezes the current language', async ({
  page,
}) => {
  await page.goto('/demo/pages/new');
  await openProject(page);
  await openPagePanel(page, 'Copy & languages');
  await expect(page.getByRole('region', { name: 'Project catalogs', exact: true })).toHaveCount(1);
  await openPuck(page);
  await page.locator('[data-puck-component="title"]').click();
  await page
    .getByRole('textbox', { name: 'Catalog value · copy.hero.title', exact: true })
    .fill('Edited in the field');
  await expect(page.locator('[data-puck-component="title"]')).toContainText('Edited in the field');
  await page
    .getByRole('button', { name: 'Use current value as direct value', exact: true })
    .click();
  await page.getByRole('combobox', { name: 'Editing language', exact: true }).selectOption('zh');
  await expect(page.locator('[data-puck-component="title"]')).toContainText('Edited in the field');
  await page.getByRole('button', { name: 'undo', exact: true }).click();
  await expect(page.locator('[data-puck-component="title"]')).toContainText('安静的发现');
});
test('adding a missing language keeps work saveable without inventing translated values', async ({
  page,
}) => {
  await page.goto('/demo/pages/new');
  await openProject(page);
  await openPagePanel(page, 'Copy & languages');
  await expect(page.getByRole('region', { name: 'Project catalogs', exact: true })).toHaveCount(1);
  await page.getByRole('textbox', { name: 'New language', exact: true }).fill('fr');
  await page.getByRole('button', { name: 'Add language', exact: true }).click();
  await expect(
    page.getByRole('alert', { name: 'Missing or invalid content dependencies' })
  ).toContainText('fr');
  await expect(page.getByRole('button', { name: 'Save As', exact: true })).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Refresh actual preview', exact: true })
  ).toBeDisabled();
  const raw = await downloadProject(page);
  expect(raw.catalogs.fr).toEqual({});
  expect(raw.catalogs.en).toEqual(project.catalogs.en);
});
test('native Save As and Save write complete files and keep current publication associations', async ({
  page,
}) => {
  await page.addInitScript(() => {
    let chosen = 0;
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: () => {
        chosen += 1;
        localStorage.setItem('picker-count', String(chosen));
        let pending = '';
        return Promise.resolve({
          name: 'working.studio.json',
          createWritable: () =>
            Promise.resolve({
              write: (text: string) => {
                pending = text;
                return Promise.resolve();
              },
              close: () => {
                localStorage.setItem('studio-file', pending);
                return Promise.resolve();
              },
              abort: () => Promise.resolve(),
            }),
        });
      },
    });
  });
  await page.goto('/demo/pages/new');
  await openProject(page);
  await openPagePanel(page, 'Copy & languages');
  await expect(page.getByRole('region', { name: 'Project catalogs', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Save As', exact: true }).click();
  await expect(
    page.getByText('Local file saved. Newer edits may still need saving.', { exact: true })
  ).toBeVisible();
  expect(
    checkedProject(await page.evaluate(() => localStorage.getItem('studio-file') ?? '{}'))
  ).toMatchObject({
    document: project.document,
    catalogs: project.catalogs,
    context: project.context,
  });
  await page
    .locator('.ui-studio-key-list button')
    .filter({ hasText: /^hero.title$/ })
    .click();
  await page.getByRole('textbox', { name: 'Catalog value', exact: true }).fill('Saved again');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(async () =>
      catalogValue(
        checkedProject(await page.evaluate(() => localStorage.getItem('studio-file') ?? '{}')),
        'en',
        ['hero', 'title']
      )
    )
    .toBe('Saved again');
  await applySection(page, 'context', { changedThroughSourceRoute: true });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(
      async () =>
        checkedProject(await page.evaluate(() => localStorage.getItem('studio-file') ?? '{}'))
          .context
    )
    .toEqual({ changedThroughSourceRoute: true });
  expect(await page.evaluate(() => localStorage.getItem('picker-count'))).toBe('1');
  await expect(page.locator('.ui-studio-status')).toContainText('Local file matches this project.');
});

test('typing into an embedded bound variable preserves focus and updates the actual document source', async ({
  page,
}) => {
  await page.goto('/demo/pages/new');
  const layout = {
    ...project.document,
    variables: { content: { title: 'Embedded' } },
    bindings: [{ nodeId: 'title', targetPath: ['text'], sourcePath: ['content', 'title'] }],
  };
  await openPagePanel(page, 'Files');
  await page.getByLabel('Open JSON file', { exact: true }).setInputFiles({
    name: 'layout.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(layout)),
  });
  await openPuck(page);
  await page.locator('[data-puck-component="title"]').click();
  const field = page.getByRole('textbox', { name: 'Catalog value · content.title', exact: true });
  await field.focus();
  await field.press('End');
  await field.pressSequentially(' updated');
  await expect(field).toBeFocused();
  await expect(field).toHaveValue('Embedded updated');
  await expect(page.locator('[data-puck-component="title"]')).toContainText('Embedded updated');
});

test('native Open remembers its writable file location and ordinary Save writes it', async ({
  page,
}) => {
  await page.addInitScript((text) => {
    const file = new File([text], 'opened.studio.json', {
      type: 'application/json',
    });
    const handle = {
      name: file.name,
      getFile: () => Promise.resolve(file),
      createWritable: () => {
        let text = '';
        return Promise.resolve({
          write: (value: string) => {
            text = value;
            return Promise.resolve();
          },
          close: () => {
            localStorage.setItem('opened-file', text);
            return Promise.resolve();
          },
          abort: () => Promise.resolve(),
        });
      },
    };
    Object.defineProperty(window, 'showOpenFilePicker', {
      configurable: true,
      value: () => Promise.resolve([handle]),
    });
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: () => Promise.reject(new Error('Save As should not be needed')),
    });
  }, JSON.stringify(project));
  await page.goto('/demo/pages/new');
  await openPagePanel(page, 'Files');
  await page
    .locator('button')
    .filter({ hasText: /^Open JSON file$/ })
    .click();
  await expect(page.locator('.ui-studio-resource-files .ui-studio-identity')).toContainText(
    'opened.studio.json'
  );
  await openPagePanel(page, 'Copy & languages');
  await page
    .locator('.ui-studio-key-list button')
    .filter({ hasText: /^hero.title$/ })
    .click();
  await page
    .getByRole('textbox', { name: 'Catalog value', exact: true })
    .fill('Written to the opened file');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(async () =>
      catalogValue(
        checkedProject(await page.evaluate(() => localStorage.getItem('opened-file') ?? '{}')),
        'en',
        ['hero', 'title']
      )
    )
    .toBe('Written to the opened file');
  await expect(page.locator('.ui-studio-status')).toContainText('Local file matches this project.');
});
