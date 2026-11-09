import type { EventSender, EventEnvelope, TrackResult } from '../contracts.js';

export const DEFAULT_TIMEOUT_MS = 5_000;
const HTTP_OK_MIN = 200;
const HTTP_OK_MAX = 299;

export const httpSender: EventSender = async ({ url, envelope, signal }) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
    signal,
  });
  // Only HTTP status belongs to the protocol. Cleanup must not delay or replace it.
  void response.body?.cancel().catch(() => {});
  return { httpStatus: response.status };
};

export async function sendEvent(
  sender: EventSender,
  url: string,
  envelope: EventEnvelope,
  timeoutMs: number
): Promise<TrackResult> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<TrackResult>((resolve) => {
    timer = setTimeout(() => {
      resolve({ status: 'failed', reason: 'timeout' });
      controller.abort();
    }, timeoutMs);
  });
  const delivery = Promise.resolve()
    .then(() => sender({ url, envelope, signal: controller.signal }))
    .then(({ httpStatus }): TrackResult => {
      if (!Number.isInteger(httpStatus) || httpStatus < 100 || httpStatus > 599)
        return { status: 'failed', reason: 'network-error' };
      return httpStatus >= HTTP_OK_MIN && httpStatus <= HTTP_OK_MAX
        ? { status: 'accepted', httpStatus }
        : { status: 'failed', reason: 'http-error', httpStatus };
    })
    .catch((): TrackResult => ({ status: 'failed', reason: 'network-error' }));
  try {
    return await Promise.race([delivery, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
