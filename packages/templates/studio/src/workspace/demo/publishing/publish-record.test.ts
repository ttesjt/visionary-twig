import { expect, it, vi } from 'vitest';
import { createDemoDraft, MAX_DEMO_IMAGE_BYTES } from './draft';
import { createDemoPublisher } from './publish-record';
import type { DemoImageAdapter, DemoRecordAdapter } from '../adapters/contracts';
const file = () => new File(['image'], 'sample.png', { type: 'image/png' });
const draft = () => ({ ...createDemoDraft(), title: 'New record' });
function setup() {
  const order: string[] = [];
  const images: DemoImageAdapter = {
    upload: vi.fn<DemoImageAdapter['upload']>(() => {
      order.push('image');
      return Promise.resolve({ url: 'blob:http://localhost/image' });
    }),
    release: vi.fn(),
  };
  const records: DemoRecordAdapter = {
    create: vi.fn<DemoRecordAdapter['create']>((record) => {
      order.push('record');
      return Promise.resolve(record);
    }),
  };
  const publisher = createDemoPublisher({ images, records, createId: () => 'new-record' });
  return { publisher, images, records, order };
}
const signal = () => new AbortController().signal;
it('does nothing until publish, resolves a file before creating a record, and does not duplicate a completed submission', async () => {
  const port = setup();
  expect(port.order).toEqual([]);
  const input = { ...draft(), image: { mode: 'file', file: file() } };
  expect(await port.publisher.publish(input, signal())).toMatchObject({
    status: 'created',
    record: { imageUrl: 'blob:http://localhost/image' },
  });
  expect(port.order).toEqual(['image', 'record']);
  await port.publisher.publish(input, signal());
  expect(port.order).toEqual(['image', 'record']);
});
it('reuses an explicit URL without invoking the image adapter and permits no image', async () => {
  for (const image of [
    { mode: 'url', url: 'https://images.example.test/picture.png' },
    { mode: 'url', url: 'blob:http://localhost/existing' },
    { mode: 'none' },
  ]) {
    const port = setup();
    const result = await port.publisher.publish({ ...draft(), image }, signal());
    expect(result.status).toBe('created');
    expect(port.images.upload).not.toHaveBeenCalled();
    expect(port.records.create).toHaveBeenCalledOnce();
  }
});
it('validates all fields and image limits before either side effect', async () => {
  for (const input of [
    { ...draft(), title: '' },
    { ...draft(), image: { mode: 'url', url: 'javascript:alert(1)' } },
    {
      ...draft(),
      image: { mode: 'file', file: new File(['bad'], 'text.txt', { type: 'text/plain' }) },
    },
  ]) {
    const port = setup();
    expect(await port.publisher.publish(input, signal())).toEqual({ status: 'invalid' });
    expect(port.order).toEqual([]);
  }
});
it('retains an uploaded image and record identity when the record write fails, then retries without another upload', async () => {
  const port = setup();
  const create = vi.mocked(port.records.create).mockRejectedValueOnce(new Error('offline'));
  const input = { ...draft(), image: { mode: 'file', file: file() } };
  expect(await port.publisher.publish(input, signal())).toEqual({
    status: 'failed',
    stage: 'record',
  });
  expect(port.images.release).not.toHaveBeenCalled();
  expect(await port.publisher.publish(input, signal())).toMatchObject({ status: 'created' });
  expect(port.images.upload).toHaveBeenCalledOnce();
  expect(create.mock.calls.map(([record]) => record.id)).toEqual(['new-record', 'new-record']);
  port.publisher.dispose();
  expect(port.images.release).not.toHaveBeenCalled();
});
it('does not write a record after image failure or an invalid adapter URL', async () => {
  for (const invalid of [false, true]) {
    const port = setup();
    if (invalid) vi.mocked(port.images.upload).mockResolvedValue({ url: 'javascript:bad' });
    else vi.mocked(port.images.upload).mockRejectedValue(new Error('upload failed'));
    expect(
      await port.publisher.publish({ ...draft(), image: { mode: 'file', file: file() } }, signal())
    ).toEqual({ status: 'failed', stage: 'image' });
    expect(port.records.create).not.toHaveBeenCalled();
    if (invalid) expect(port.images.release).toHaveBeenCalledOnce();
  }
});
it('cancels late image completion and releases its URL even when an adapter ignores abort', async () => {
  const port = setup();
  let finish: (image: { url: string }) => void = () => undefined;
  vi.mocked(port.images.upload).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  const controller = new AbortController();
  const pending = port.publisher.publish(
    { ...draft(), image: { mode: 'file', file: file() } },
    controller.signal
  );
  expect(await port.publisher.publish(draft(), signal())).toEqual({ status: 'busy' });
  controller.abort();
  port.publisher.dispose();
  finish({ url: 'blob:http://localhost/late' });
  expect(await pending).toEqual({ status: 'cancelled' });
  expect(port.records.create).not.toHaveBeenCalled();
  expect(port.images.release).toHaveBeenCalledOnce();
});
it('does not revoke an image referenced by a write which completes after the form is disposed', async () => {
  const port = setup();
  let finish: (() => void) | undefined;
  vi.mocked(port.records.create).mockImplementation(
    (record) =>
      new Promise((resolve) => {
        finish = () => resolve(record);
      })
  );
  const pending = port.publisher.publish(
    { ...draft(), image: { mode: 'file', file: file() } },
    signal()
  );
  await vi.waitFor(() => expect(finish).toBeDefined());
  port.publisher.dispose();
  finish?.();
  expect(await pending).toMatchObject({ status: 'created' });
  expect(port.images.release).not.toHaveBeenCalled();
});

it('rejects absent and oversized local images before upload', async () => {
  for (const file of [
    null,
    new File([new Uint8Array(MAX_DEMO_IMAGE_BYTES + 1)], 'large.png', { type: 'image/png' }),
  ]) {
    const port = setup();
    expect(
      await port.publisher.publish({ ...draft(), image: { mode: 'file', file } }, signal())
    ).toEqual({ status: 'invalid' });
    expect(port.order).toEqual([]);
  }
});
