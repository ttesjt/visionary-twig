import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { selectApp, appFilter } from '../../tooling/workspace-apps.ts';
import { freePort, withServer } from './verify-inputs.mjs';
import { pnpmCommand, runProcesses } from '../lib/processes.mjs';
import { installPageErrorFixture } from './page-error-fixture.mjs';

async function inspectErrors(url, fixture) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ baseURL: url });
    const page = await context.newPage();
    const resourceReads = [];
    page.on('request', (request) => {
      if (request.url().includes('/resources/text/')) resourceReads.push(request.url());
    });
    const noPrivateDetails = async () => {
      assert.equal((await page.locator('body').innerText()).includes('private-'), false);
    };
    try {
      await page.goto('/verification-client-error');
      await page.getByRole('link', { name: 'Missing link', exact: true }).click();
      await page.getByRole('heading', { name: 'Page not found', exact: true }).waitFor();

      for (const [language, heading, retry] of [
        ['en', 'This page could not load', 'Try again'],
        ['zh', '页面未能加载', '重试'],
      ]) {
        fixture.setFailure('page', true);
        await page.goto('/verification-server-error?lang=' + language);
        await page.getByRole('heading', { name: heading, exact: true }).waitFor();
        await noPrivateDetails();
        fixture.setFailure('page', false);
        await page.getByRole('button', { name: retry, exact: true }).click();
        await page.getByRole('heading', { name: 'Recovered page', exact: true }).waitFor();

        await page.goto('/verification-client-error?lang=' + language);
        await page.getByRole('button', { name: 'Crash page', exact: true }).click();
        await page.getByRole('heading', { name: heading, exact: true }).waitFor();
        await noPrivateDetails();
        await page.getByRole('button', { name: retry, exact: true }).click();
        await page.getByRole('button', { name: 'Crash page', exact: true }).waitFor();
      }

      fixture.setFailure('metadata', true);
      await page.goto('/');
      await page.getByRole('heading', { name: 'This page could not load', exact: true }).waitFor();
      await noPrivateDetails();
      fixture.setFailure('metadata', false);
      await page.getByRole('button', { name: 'Try again', exact: true }).click();
      await page.getByRole('heading', { name: 'Welcome.', exact: true }).waitFor();

      resourceReads.length = 0;
      fixture.setFailure('root', true);
      const response = await page.goto('/');
      assert.equal(response.status(), 500);
      await page.getByRole('heading', { name: 'This page could not load', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Reload page', exact: true }).waitFor();
      await noPrivateDetails();
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      assert.deepEqual(resourceReads, [], 'Global error must not fetch a dictionary.');
      fixture.setFailure('root', false);
      await page.getByRole('button', { name: 'Reload page', exact: true }).click();
      await page.getByRole('heading', { name: 'Welcome.', exact: true }).waitFor();

      await page.getByRole('button', { name: 'Crash root', exact: true }).click();
      await page.getByRole('button', { name: 'Reload page', exact: true }).waitFor();
      await noPrivateDetails();
      await page.getByRole('button', { name: 'Reload page', exact: true }).click();
      await page.getByRole('heading', { name: 'Welcome.', exact: true }).waitFor();
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

/** Invoked only after official generation, never against a developer's source app. */
export async function verifyPageErrorRecovery(root, id, environment) {
  const app = selectApp(root, id);
  const build = async () => {
    const code = await runProcesses([pnpmCommand(['build', '--app', id])], {
      cwd: root,
      env: environment,
    });
    assert.equal(code, 0, 'Page-error fixture build failed.');
  };
  const fixture = installPageErrorFixture(root, app);
  try {
    await build();
    const port = await freePort();
    await withServer(
      root,
      [
        '--filter',
        appFilter(root, app),
        'start',
        '--hostname',
        '127.0.0.1',
        '--port',
        String(port),
      ],
      port,
      (url) => inspectErrors(url, fixture),
      environment
    );
    console.log(
      'Page-error verification passed: localized page recovery, root/provider/metadata failure and offline global UI.'
    );
  } finally {
    fixture.restore();
    await build();
  }
}
