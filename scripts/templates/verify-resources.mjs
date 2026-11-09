import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { discoverApps, discoverTemplateApps } from '../../tooling/workspace-apps.ts';
import { pnpmCommand, runProcesses } from '../lib/processes.mjs';
import { freePort, withServer } from './verify-inputs.mjs';
import { withVerificationInputs } from './verification-inputs.mjs';

const CUSTOM_TITLE = 'Prepared namespace welcome';
const CUSTOM_HOME_TITLE = 'Prepared homepage';
const CUSTOM_METADATA_TITLE = 'Prepared document title';
const CUSTOM_THEME_LABEL = 'Prepared appearance';
const CUSTOM_SETTINGS_LABEL = 'Prepared settings source';
const CUSTOM_TRACKING_LABEL = 'Prepared tracking action';
const CUSTOM_COLLECTION = 'Prepared collection';
/** Actual prepare/dev/build/start flow; owns only preflighted disposable/default inputs. */
export async function verifyNamespaceInputsFlow(root, appId = 'plain', environment = process.env) {
  const host = [...discoverApps(root), ...discoverTemplateApps(root)].find(
    (entry) => entry.id === appId
  );
  assert.ok(host, 'Missing namespace verification host: ' + appId);
  const app = host.directory;
  const read = (relative) => readFileSync(path.join(app, relative), 'utf8');
  const json = (relative) => JSON.parse(read(relative));
  const hasContent = json('package.json').workspaceContentResources === true;
  const description = json('.generated/text/en/main.json')['home.description'];
  let showIntroduction = false;
  const run = async (args, success = true) => {
    if (!success) console.log('Expected rejection: ' + args.join(' '));
    const code = await runProcesses([pnpmCommand(args)], { cwd: app, env: environment });
    if (success) assert.equal(code, 0, args.join(' '));
    else assert.notEqual(code, 0, 'Expected rejection: ' + args.join(' '));
  };
  await withVerificationInputs([app], async (inputs) => {
    const before = read('.generated/text/resources.json');
    const originalConfig = read('.generated/config/app.json');
    inputs.createCustom(app, { home: { showIntroduction: false } });
    const customDirectory = path.join(app, '.local/content/text/en');
    mkdirSync(customDirectory, { recursive: true });
    const customFile = path.join(customDirectory, 'demo.json');
    const validCustom = JSON.stringify({ title: CUSTOM_TITLE });
    writeFileSync(customFile, validCustom);
    writeFileSync(
      path.join(customDirectory, 'main.json'),
      JSON.stringify({
        'metadata.title': CUSTOM_METADATA_TITLE,
        'theme.label': CUSTOM_THEME_LABEL,
        'home.title': CUSTOM_HOME_TITLE,
        'remoteSettings.source': CUSTOM_SETTINGS_LABEL,
        'tracking.sendTyped': CUSTOM_TRACKING_LABEL,
      })
    );
    const originalContract = read('.generated/text/contracts.json');
    await run(['text:prepare']);
    assert.equal(read('.generated/config/app.json'), originalConfig);
    assert.notEqual(read('.generated/text/resources.json'), before);
    assert.equal(read('.generated/text/contracts.json'), originalContract);
    assert.equal(json('.generated/text/en/demo.json').title, CUSTOM_TITLE);
    await run(['config:prepare']);
    await run(['app:check']);
    assert.equal(json('.generated/config/app.json').home.showIntroduction, false);
    if (hasContent) {
      const data = path.join(app, '.local/content/data');
      mkdirSync(data, { recursive: true });
      writeFileSync(
        path.join(data, 'base.json'),
        JSON.stringify({ collection: CUSTOM_COLLECTION })
      );
      await run(['content:prepare']);
      assert.equal(json('.generated/content/base.json').collection, CUSTOM_COLLECTION);
      const beforeContent = read('.generated/content/prepared.json');
      writeFileSync(path.join(data, 'catalog.json'), JSON.stringify({ works: false }));
      await run(['content:prepare'], false);
      assert.equal(read('.generated/content/prepared.json'), beforeContent);
      writeFileSync(path.join(data, 'catalog.json'), '{}');
      await run(['content:prepare']);
    }
    const prepared = read('.generated/text/catalog.json');
    writeFileSync(customFile, JSON.stringify({ greeting: 'Hello {wrongVariable}' }));
    await run(['text:prepare'], false);
    assert.equal(read('.generated/text/catalog.json'), prepared);
    writeFileSync(customFile, validCustom);
    await run(['app:check']);
    const translatedCustom = path.join(app, '.local/content/text/zh');
    mkdirSync(translatedCustom, { recursive: true });
    writeFileSync(path.join(translatedCustom, 'demo.json'), '{}');
    await run(['app:check'], false);
    await run(['text:prepare']);
    await run(['app:check']);
    const { revision, contentVersion } = json('.generated/text/resources.json');
    const browser = await chromium.launch();
    async function inspect(url) {
      const context = await browser.newContext({ baseURL: url });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto('/');
        await page.getByRole('heading', { name: CUSTOM_HOME_TITLE, exact: true }).waitFor();
        assert.equal(await page.title(), CUSTOM_METADATA_TITLE);
        if (hasContent)
          assert.equal(
            await page.getByText(description, { exact: true }).count(),
            showIntroduction ? 1 : 0
          );
        if (hasContent)
          await page
            .getByRole('link', { name: 'Explore ' + CUSTOM_COLLECTION, exact: true })
            .waitFor();
        await page.getByRole('combobox', { name: CUSTOM_THEME_LABEL, exact: true }).waitFor();
        await page.goto('/examples/remote-settings');
        await page.getByRole('combobox', { name: CUSTOM_SETTINGS_LABEL, exact: true }).waitFor();
        await page.goto('/examples/event-tracking');
        await page.getByRole('button', { name: CUSTOM_TRACKING_LABEL, exact: true }).waitFor();
        for (const mode of ['ssr', 'csr']) {
          await page.goto('/examples/text/' + mode + '?lang=en');
          await page.getByRole('heading', { name: CUSTOM_TITLE, exact: true }).waitFor();
          await page.getByTestId('text-note').fill('Preserved custom state');
          await page.getByRole('button', { name: '中文', exact: true }).click();
          await page.getByTestId('text-content').filter({ hasText: '文案资源' }).waitFor();
          await page.getByRole('button', { name: 'English', exact: true }).click();
          await page.getByRole('heading', { name: CUSTOM_TITLE, exact: true }).waitFor();
          assert.equal(await page.getByTestId('text-note').inputValue(), 'Preserved custom state');
        }
        if (hasContent) {
          await page.goto('/examples/content');
          await page.getByRole('heading', { name: CUSTOM_COLLECTION, exact: true }).waitFor();
          await page.getByTestId('catalog').filter({ hasText: 'Paper Study' }).waitFor();
          await page.getByRole('button', { name: 'Making notes', exact: true }).click();
          await page.getByTestId('making-notes').filter({ hasText: 'Graphite on paper' }).waitFor();
        }
        const response = await context.request.get(
          `/resources/text/${contentVersion}-${revision}/en/demo.json`
        );
        assert.equal(response.status(), 200);
        assert.equal((await response.json()).title, CUSTOM_TITLE);
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    }
    try {
      const port = await freePort();
      inputs.setDevPort(app, port);
      await withServer(root, ['dev', '--app', appId], port, inspect, environment);
      writeFileSync(
        path.join(app, '.local/config/app.json'),
        JSON.stringify({ home: { showIntroduction: true } })
      );
      await run(['config:prepare']);
      showIntroduction = true;
      await run(['build']);
      inputs.hideSources(app);
      const productionPort = await freePort();
      await withServer(
        app,
        ['start', '--hostname', '127.0.0.1', '--port', String(productionPort)],
        productionPort,
        inspect,
        environment
      );
    } finally {
      await browser.close();
    }
  });
  console.log(
    'Namespace inputs verified: default/custom, freshness rejection, independent config, dev and source-free SSR/CSR/HTTP.'
  );
}
