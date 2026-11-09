import { expect, it, vi } from 'vitest';
import { createFilePreview } from './use-file-preview';
it('creates a local preview only when observed and releases it after the final observer leaves', () => {
  const create = vi.fn(() => 'blob:http://localhost/preview');
  const revoke = vi.fn();
  const preview = createFilePreview(new File(['image'], 'file.png', { type: 'image/png' }), {
    create,
    revoke,
  });
  expect(create).not.toHaveBeenCalled();
  const stop = preview.subscribe(() => undefined);
  const stopOther = preview.subscribe(() => undefined);
  expect(preview.getSnapshot()).toBe('blob:http://localhost/preview');
  expect(create).toHaveBeenCalledOnce();
  stop();
  expect(revoke).not.toHaveBeenCalled();
  stopOther();
  expect(revoke).toHaveBeenCalledOnce();
  expect(preview.getSnapshot()).toBeUndefined();
});
