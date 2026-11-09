import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import wranglerManifest from 'wrangler/package.json' with { type: 'json' };
const execute = promisify(execFile);
const executable = fileURLToPath(new URL('../bin/wrangler.mjs', import.meta.url));
it('forwards to the pinned public Wrangler executable from the calling app directory', async () => {
  const { stdout } = await execute(process.execPath, [executable, '--version']);
  expect(stdout.trim()).toBe(wranglerManifest.version);
});
it('preserves CLI failure exit status', async () => {
  await expect(
    execute(process.execPath, [executable, '--unknown-hosting-command'])
  ).rejects.toMatchObject({ code: 1 });
});
