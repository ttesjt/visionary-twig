// @vitest-environment node
import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { prepareMetadata } from './server';

it('does not read resources or environment while disabled', async () => {
  const load = vi.fn(() => {
    throw new Error('Source must not execute');
  });
  expect(await prepareMetadata({ enabled: false, load }, { locale: 'zh' })).toEqual({});
  expect(load).not.toHaveBeenCalled();
});
it('passes arbitrary site context and leaves resource ownership with the source', async () => {
  const load = vi.fn(({ language }: { language: string }) => ({
    title: language,
    description: 'Ready.',
  }));
  expect(await prepareMetadata({ enabled: true, load }, { language: 'zh' })).toMatchObject({
    title: 'zh',
  });
  expect(load).toHaveBeenCalledOnce();
});
it('preserves source failures and rejects invalid resolved fields', async () => {
  const error = new Error('Unknown custom namespace');
  await expect(
    prepareMetadata(
      {
        enabled: true,
        load: () => {
          throw error;
        },
      },
      undefined
    )
  ).rejects.toBe(error);
  await expect(
    prepareMetadata(
      { enabled: true, load: () => ({ title: '', description: 'Ready.' }) },
      undefined
    )
  ).rejects.toThrow();
});
