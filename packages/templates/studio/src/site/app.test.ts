import { expect, it } from 'vitest';
import manifest from '../../package.json';
it('declares a loopback host and separate development/browser ports', () => {
  expect(manifest.workspaceApp).toMatchObject({
    hostname: '127.0.0.1',
  });
  expect(manifest.workspaceApp.devPort).not.toBe(manifest.workspaceApp.testPort);
});
