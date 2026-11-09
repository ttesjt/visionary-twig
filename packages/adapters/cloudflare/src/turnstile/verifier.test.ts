import { expect, it, vi } from 'vitest';
import { createTurnstileVerifier } from './verifier.js';
const configuration = {
  secretKey: 'private-secret',
  hostname: 'portfolio.example.test',
  action: 'contact',
};
it.each([
  { success: false },
  { success: true, hostname: 'other.example.test', action: 'contact' },
  { success: true, hostname: configuration.hostname, action: 'other' },
  { success: true },
])('rejects invalid, unbound or wrong-context proofs', async (response) => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(response));
  expect(await createTurnstileVerifier({ ...configuration, fetch: fetcher })('token')).toBe(false);
});
it('accepts only a proof verified for the configured hostname and action', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      success: true,
      hostname: configuration.hostname,
      action: configuration.action,
    })
  );
  expect(await createTurnstileVerifier({ ...configuration, fetch: fetcher })('token')).toBe(true);
  const body = fetcher.mock.calls[0]?.[1]?.body;
  if (typeof body !== 'string') throw new Error('Expected a JSON verification request.');
  expect(JSON.parse(body)).toEqual({
    secret: configuration.secretKey,
    response: 'token',
  });
});
it('distinguishes service/configuration failures from an invalid visitor proof', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ success: false, 'error-codes': ['invalid-input-secret'] }));
  await expect(
    createTurnstileVerifier({ ...configuration, fetch: fetcher })('token')
  ).rejects.toMatchObject({ code: 'configuration' });
  fetcher.mockResolvedValue(Response.json({ success: 'yes' }));
  await expect(
    createTurnstileVerifier({ ...configuration, fetch: fetcher })('token')
  ).rejects.toMatchObject({ code: 'invalid-response' });
});
it('rejects absent and oversized proofs before any provider request', async () => {
  const fetcher = vi.fn<typeof fetch>();
  const verify = createTurnstileVerifier({ ...configuration, fetch: fetcher });
  expect(await verify('')).toBe(false);
  expect(await verify('x'.repeat(2049))).toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
});
