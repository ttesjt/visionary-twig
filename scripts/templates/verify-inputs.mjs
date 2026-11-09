import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { setTimeout, clearTimeout } from 'node:timers';
import { chromium } from '@playwright/test';
import { pnpmCommand, runProcesses } from '../lib/processes.mjs';
import { discoverApps, discoverTemplateApps } from '../../tooling/workspace-apps.ts';
import { withVerificationInputs } from './verification-inputs.mjs';

const START_TIMEOUT_MS = 90_000;
const STOP_TIMEOUT_MS = 10_000;
const INPUT_UI_TIMEOUT_MS = 15_000;
const POLL_MS = 250;
const REQUEST_TIMEOUT_MS = 2000;
const MAX_LOG_CHARACTERS = 12_000;
const CUSTOM_STUDIO_RECORD = 'Prepared field guide';
const studio = {
  configuration: { workspace: { showIntroduction: false } },
  title: 'Prepared Studio',
  copy: {
    'metadata.title': 'Prepared Studio',
    'host.example': 'Open prepared example',
    'workspace.brand': 'Prepared workspace',
    'workspace.pages.overview.title': 'Prepared Studio',
    'workspace.demo.pages.controls.files': 'Prepared files',
    'workbench.title': 'Prepared Studio',
    'workbench.saveAs': 'Save prepared project as',
    'workbench.previewEmpty': 'Prepared empty page',
    'workbench.previewEmptyHelp': 'Add prepared content to see a preview.',
    'workbench.themeDark': 'Prepared night',
    'workbench.viewportPhone': 'Prepared phone',
    'workbench.viewportOption': '{label}: {width}px',
  },
};
export async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}
async function command(root, args, environment) {
  const code = await runProcesses([pnpmCommand(args)], {
    cwd: root,
    env: { ...environment, UI_THEME_POLICY: 'selectable' },
  });
  assert.equal(code, 0, args.join(' '));
}
export async function withServer(root, args, port, inspect, environment) {
  const [bin, parameters] = pnpmCommand(args);
  const child = spawn(bin, parameters, {
    cwd: root,
    env: { ...environment, UI_THEME_POLICY: 'selectable' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });
  const closed = once(child, 'close');
  let output = '';
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (value) => {
      output = (output + value).slice(-MAX_LOG_CHARACTERS);
    });
  const url = 'http://127.0.0.1:' + port;
  try {
    const deadline = Date.now() + START_TIMEOUT_MS;
    let ready = false;
    while (Date.now() < deadline && child.exitCode === null) {
      try {
        ready = (
          await globalThis.fetch(url, {
            signal: globalThis.AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          })
        ).ok;
      } catch {
        /* The owned server is still starting. */
      }
      if (ready) break;
      await delay(POLL_MS);
    }
    assert.ok(ready, 'Clone server failed to start: ' + output);
    await inspect(url);
  } finally {
    const signal = (value) => {
      if (!child.pid) return;
      try {
        if (process.platform === 'win32') child.kill(value);
        else process.kill(-child.pid, value);
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    };
    signal('SIGTERM');
    let timeout;
    try {
      await Promise.race([
        closed,
        new Promise((_, reject) => {
          timeout = setTimeout(() => {
            signal('SIGKILL');
            reject(new Error('Owned clone server did not close its output streams.'));
          }, STOP_TIMEOUT_MS);
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }
}

/** Verify one source or generated Studio and restore its original inputs. */
export async function verifyStudioInputsFlow(root, appId, environment) {
  const host = [...discoverApps(root), ...discoverTemplateApps(root)].find(
    (entry) => entry.id === appId
  );
  assert.ok(host, 'Missing Studio verification host: ' + appId);
  const app = host.directory;
  const defaults = JSON.parse(
    readFileSync(path.join(app, 'content/default/text/en/main.json'), 'utf8')
  );
  return withVerificationInputs([app], async (inputs) => {
    const browser = await chromium.launch();
    async function inspect(url) {
      const page = await browser.newPage();
      page.setDefaultTimeout(INPUT_UI_TIMEOUT_MS);
      page.setDefaultNavigationTimeout(START_TIMEOUT_MS);
      try {
        await page.goto(url);
        assert.equal(await page.title(), studio.title);
        assert.equal(
          await page.getByText(defaults['workspace.overview.body'], { exact: true }).count(),
          0,
          'Prepared config must independently control presentation.'
        );
        await page.getByRole('heading', { name: studio.title, exact: true }).waitFor();
        await page
          .locator('.ui-studio-brand')
          .getByText('Prepared workspace', { exact: true })
          .waitFor();
        await page.goto(url + '/demo');
        await page
          .getByRole('region', { name: 'Card preview' })
          .getByRole('heading', { name: CUSTOM_STUDIO_RECORD })
          .waitFor();
        await page.goto(url + '/demo/pages/new');
        await page.getByRole('button', { name: 'Save prepared project as' }).waitFor();
        await page.getByText(studio.copy['workbench.previewEmpty'], { exact: true }).waitFor();
        await page.getByText(studio.copy['workbench.previewEmptyHelp'], { exact: true }).waitFor();
        assert.equal(await page.locator('.ui-studio-preview iframe').count(), 0);
        // Empty Viewer intentionally has no frame. Load content before inspecting
        // the isolated preview's theme and viewport in both dev and production.
        await page
          .locator('.ui-studio-resource-manager')
          .getByRole('tab', {
            name: studio.copy['workspace.demo.pages.controls.files'],
            exact: true,
          })
          .click();
        await page.getByRole('button', { name: studio.copy['host.example'], exact: true }).click();
        const theme = page.getByLabel('Preview theme');
        assert.equal(await theme.locator('option[value=dark]').textContent(), 'Prepared night');
        await theme.selectOption('dark');
        await page
          .frameLocator('iframe[title="Actual content page"]')
          .locator('main[data-theme=dark]')
          .waitFor();
        assert.equal(await page.locator('.ui-studio-shell').getAttribute('data-theme'), 'system');
        assert.equal(await page.locator('.ui-studio-workbench').getAttribute('data-theme'), null);
        const viewport = page.getByLabel('Preview viewport');
        assert.equal(
          await viewport.locator('option[value="390"]').textContent(),
          'Prepared phone: 390px'
        );
        await viewport.selectOption('390');
        assert.equal(await viewport.inputValue(), '390');
      } finally {
        await page.close();
      }
    }
    try {
      const local = path.join(app, '.local');
      inputs.createCustom(app, studio.configuration);
      const directory = path.join(local, 'content/text/en');
      mkdirSync(directory, { recursive: true });
      writeFileSync(path.join(directory, 'main.json'), JSON.stringify(studio.copy));
      const data = path.join(local, 'content/data');
      mkdirSync(data, { recursive: true });
      writeFileSync(
        path.join(data, 'base.json'),
        JSON.stringify({ 'field-guide': { title: CUSTOM_STUDIO_RECORD } })
      );
      await command(app, ['content:prepare', '--source', 'custom'], environment);
      const originalConfig = readFileSync(path.join(app, '.generated/config/app.json'), 'utf8');
      await command(app, ['text:prepare', '--source', 'custom'], environment);
      assert.equal(
        readFileSync(path.join(app, '.generated/config/app.json'), 'utf8'),
        originalConfig
      );
      assert.equal(
        JSON.parse(readFileSync(path.join(app, '.generated/config/manifest.json'), 'utf8')).source,
        'default'
      );
      await command(app, ['config:prepare', '--source', 'custom'], environment);
      await command(app, ['app:check'], environment);
      const before = readFileSync(path.join(app, '.generated/config/app.json'), 'utf8');
      writeFileSync(path.join(local, 'config/app.json'), '{"unexpected":true}');
      const rejected = await runProcesses([pnpmCommand(['app:prepare', '--source', 'custom'])], {
        cwd: app,
        env: environment,
      });
      assert.notEqual(rejected, 0, 'Invalid configuration must fail preparation.');
      assert.equal(readFileSync(path.join(app, '.generated/config/app.json'), 'utf8'), before);
      writeFileSync(path.join(local, 'config/app.json'), JSON.stringify(studio.configuration));
      await command(app, ['app:prepare', '--source', 'custom'], environment);
      const port = await freePort();
      inputs.setDevPort(app, port);
      await withServer(root, ['dev', '--app', appId], port, inspect, environment);

      await command(app, ['build'], environment);
      inputs.hideSources(app);
      const productionPort = await freePort();
      await withServer(
        app,
        ['start', '--hostname', '127.0.0.1', '--port', String(productionPort)],
        productionPort,
        inspect,
        environment
      );
      console.log(
        'Prepared text/config verified: custom dictionaries, renamed app commands, dev and source-free production.'
      );
    } finally {
      await browser.close();
    }
  });
}
