// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import {
  PREVIEW_TRACKING_GRANTED,
  PREVIEW_TRACKING_HEADER,
} from '../../../preview/tracking-signal';

const { readConfig, put, permission } = vi.hoisted(() => ({
  readConfig: vi.fn(),
  permission: vi.fn<(request: Request) => Promise<boolean>>(),
  put: vi.fn(() => 'snapshot'),
}));
vi.mock('server-only', () => ({}));
vi.mock('../../../infra/resources/server', () => ({ readGeneratedJsonURL: readConfig }));
vi.mock('../../../site/preview-tracking-permission.server', () => ({
  hasPreviewTrackingPermission: permission,
}));
vi.mock('../../../preview/preview-server', () => ({ previewStore: { put } }));
import { POST } from './route';

const document = {
  documentId: 'sample',
  schemaVersion: 1,
  revision: 1,
  data: { root: {}, content: [] },
};
const endpoint = 'https://events.example.test/preview';
function setup(enabled: boolean, url = endpoint) {
  vi.stubEnv('EVENT_TRACKING_URL', url);
  permission.mockResolvedValue(true);
  readConfig.mockResolvedValue({
    version: 1,
    workspace: { showIntroduction: true },
    tracking: { enabled },
  });
  const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', send);
  return send;
}
function submit(permission?: string, body: object = { document }) {
  return POST(
    new Request('http://127.0.0.1/api/preview', {
      method: 'POST',
      headers: {
        host: '127.0.0.1',
        origin: 'http://127.0.0.1',
        'content-type': 'application/json',
        ...(permission ? { [PREVIEW_TRACKING_HEADER]: permission } : {}),
      },
      body: JSON.stringify(body),
    })
  );
}
async function expectPreview(response: Response) {
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ url: '/preview/snapshot' });
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

it('reads permission on each accepted request and sends only the allowed event', async () => {
  const send = setup(true);
  expect((await submit(PREVIEW_TRACKING_GRANTED, { wrong: true })).status).toBe(422);
  expect(put).not.toHaveBeenCalled();
  await expectPreview(await submit());
  expect(send).not.toHaveBeenCalled();
  await expectPreview(await submit(PREVIEW_TRACKING_GRANTED));
  await expectPreview(await submit('denied'));
  expect(send).toHaveBeenCalledOnce();
  const body = send.mock.calls[0]?.[1]?.body;
  if (typeof body !== 'string') throw new Error('Expected a JSON tracking request.');
  expect(JSON.parse(body)).toEqual({
    projectId: 'studio',
    event: 'preview_snapshot_accepted',
    data: { status: 'accepted' },
  });
});
it('skips initialization with tracking disabled even when the endpoint is malformed', async () => {
  const send = setup(false, 'malformed endpoint');
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await expectPreview(await submit(PREVIEW_TRACKING_GRANTED));
  expect(send).not.toHaveBeenCalled();
  expect(warn).not.toHaveBeenCalled();
});
it('keeps previews usable after setup or transport failure and retries on later requests', async () => {
  const send = setup(true, 'malformed endpoint');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  await expectPreview(await submit(PREVIEW_TRACKING_GRANTED));
  expect(send).not.toHaveBeenCalled();
  vi.stubEnv('EVENT_TRACKING_URL', endpoint);
  send.mockRejectedValueOnce(new Error('Offline'));
  await expectPreview(await submit(PREVIEW_TRACKING_GRANTED));
  await expectPreview(await submit(PREVIEW_TRACKING_GRANTED));
  expect(send).toHaveBeenCalledTimes(2);
});

it('honors a request-specific server veto and isolates permission lookup failures', async () => {
  const send = setup(true);
  permission
    .mockResolvedValueOnce(false)
    .mockRejectedValueOnce(new Error('Consent store unavailable'));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  await expectPreview(await submit(PREVIEW_TRACKING_GRANTED));
  await expectPreview(await submit(PREVIEW_TRACKING_GRANTED));
  expect(send).not.toHaveBeenCalled();
  await expectPreview(await submit(PREVIEW_TRACKING_GRANTED));
  expect(send).toHaveBeenCalledOnce();
});
