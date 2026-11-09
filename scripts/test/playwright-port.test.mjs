import assert from 'node:assert/strict';
import { test } from 'node:test';
import { URL } from 'node:url';
import { DEFAULT_PLAYWRIGHT_PORT, playwrightAddress } from '../../tooling/playwright-port.ts';

test('Playwright uses the workspace default app and one validated address', () => {
  if (DEFAULT_PLAYWRIGHT_PORT === undefined) {
    assert.throws(() => playwrightAddress(undefined), /Choose --app|Unknown workspace app/);
    return; // Source repositories and library-only starters intentionally have no default browser host.
  }
  const address = playwrightAddress(undefined);
  assert.equal(address.port, DEFAULT_PLAYWRIGHT_PORT);
  const overridden = new URL(address.baseURL);
  overridden.port = '3111';
  assert.deepEqual(playwrightAddress('3111'), { port: 3111, baseURL: overridden.origin });
  for (const raw of ['', '0', '-1', '65536', '1.5', '3100;echo', ' 3111', 'NaN', '03111'])
    assert.throws(() => playwrightAddress(raw), /PLAYWRIGHT_PORT/);
});
