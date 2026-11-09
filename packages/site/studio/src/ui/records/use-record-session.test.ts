import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { ContentResult } from '@frontend/ui-document';
import type { StudioRecordUpdateResult, StudioRecordUpdater } from '../../data/records.js';
import { useStudioRecordSession } from './use-record-session.js';
const schema = z.strictObject({ key: z.string(), text: z.string().min(1) });
type Note = z.infer<typeof schema>;
const initial: Note = { key: 'note', text: 'Original' };
function validate(input: unknown): ContentResult<Note> {
  const result = schema.safeParse(input);
  return result.success
    ? { ok: true, value: result.data }
    : {
        ok: false,
        errors: [{ code: 'invalid-note', path: ['text'], message: 'Text is required.' }],
      };
}
function pendingWrite() {
  let resolve: ((result: StudioRecordUpdateResult<Note>) => void) | undefined;
  const promise = new Promise<StudioRecordUpdateResult<Note>>((complete) => {
    resolve = complete;
  });
  return {
    promise,
    resolve: (result: StudioRecordUpdateResult<Note>) => {
      if (!resolve) throw new Error('Deferred resolver was not initialized.');
      resolve(result);
    },
  };
}
function mount(adapter: StudioRecordUpdater<Note>) {
  return renderHook(() =>
    useStudioRecordSession({
      initial,
      adapter,
      validate,
      identity: (row) => row.key,
      fingerprint: JSON.stringify,
    })
  );
}
it('awaits acknowledgement, deduplicates writes and preserves edits made while saving', async () => {
  const pending = pendingWrite();
  const adapter = { update: vi.fn<StudioRecordUpdater<Note>['update']>(() => pending.promise) };
  const { result } = mount(adapter);
  act(() => result.current.setDraft({ ...initial, text: 'Submitted' }));
  let writing: Promise<void> | undefined;
  act(() => {
    writing = result.current.save();
  });
  expect(result.current.busy).toBe(true);
  expect(result.current.baseline).toEqual(initial);
  await act(() => result.current.save());
  expect(adapter.update).toHaveBeenCalledOnce();
  expect(adapter.update.mock.calls[0]?.[2]).toEqual(initial);
  act(() => result.current.setDraft({ ...initial, text: 'Newer edit' }));
  await act(async () => {
    pending.resolve({ status: 'saved', record: { ...initial, text: 'Submitted' } });
    await writing;
  });
  expect(result.current.baseline.text).toBe('Submitted');
  expect(result.current.draft.text).toBe('Newer edit');
  expect(result.current.dirty).toBe(true);
  expect(result.current.busy).toBe(false);
});
it('adopts a canonical saved record only if its draft was not edited in the meantime', async () => {
  const adapter = {
    update: vi
      .fn<StudioRecordUpdater<Note>['update']>()
      .mockResolvedValue({ status: 'saved', record: { ...initial, text: 'Canonical' } }),
  };
  const { result } = mount(adapter);
  act(() => result.current.setDraft({ ...initial, text: 'Changed' }));
  await act(() => result.current.save());
  expect(result.current.draft.text).toBe('Canonical');
  expect(result.current.dirty).toBe(false);
});
it('retains the draft and baseline after transport failure, then permits retry', async () => {
  const adapter = {
    update: vi
      .fn<StudioRecordUpdater<Note>['update']>()
      .mockRejectedValueOnce(new Error('Offline'))
      .mockImplementation((record) => Promise.resolve({ status: 'saved', record })),
  };
  const { result } = mount(adapter);
  act(() => result.current.setDraft({ ...initial, text: 'Kept draft' }));
  await act(() => result.current.save());
  expect(result.current.state.status).toBe('unavailable');
  expect(result.current.draft.text).toBe('Kept draft');
  expect(result.current.baseline).toEqual(initial);
  await act(() => result.current.save());
  expect(result.current.dirty).toBe(false);
});
it('rejects invalid input before calling an adapter and exposes remote validation failures', async () => {
  const adapter = {
    update: vi.fn<StudioRecordUpdater<Note>['update']>().mockResolvedValue({
      status: 'invalid',
      errors: [{ code: 'too-large', path: ['text'], message: 'Shorten the record.' }],
    }),
  };
  const { result } = mount(adapter);
  act(() => result.current.setDraft({ ...initial, text: '' }));
  await act(() => result.current.save());
  expect(adapter.update).not.toHaveBeenCalled();
  expect(result.current.state.status).toBe('invalid');
  act(() => result.current.setDraft({ ...initial, text: 'Valid locally' }));
  await act(() => result.current.save());
  expect(result.current.state).toMatchObject({
    status: 'invalid',
    errors: [{ code: 'too-large' }],
  });
  expect(result.current.dirty).toBe(true);
});
it('handles conflict, missing and cancelled writes without fabricating a saved baseline', async () => {
  for (const status of ['conflict', 'not-found', 'cancelled'] as const) {
    const adapter = {
      update: vi.fn<StudioRecordUpdater<Note>['update']>().mockResolvedValue({ status }),
    };
    const hook = mount(adapter);
    act(() => hook.result.current.setDraft({ ...initial, text: 'Unsaved' }));
    await act(() => hook.result.current.save());
    expect(hook.result.current.state.status).toBe(status === 'cancelled' ? 'idle' : status);
    expect(hook.result.current.dirty).toBe(true);
    expect(hook.result.current.busy).toBe(false);
    hook.unmount();
  }
});
it('aborts unmounted sessions and ignores their late acknowledgement', async () => {
  const pending = pendingWrite();
  const adapter = { update: vi.fn<StudioRecordUpdater<Note>['update']>(() => pending.promise) };
  const hook = mount(adapter);
  let saving: Promise<void> | undefined;
  act(() => {
    saving = hook.result.current.save();
  });
  const signal = adapter.update.mock.calls[0]?.[1];
  hook.unmount();
  expect(signal?.aborted).toBe(true);
  const replacement = mount(adapter);
  await act(async () => {
    pending.resolve({ status: 'saved', record: { ...initial, text: 'Obsolete' } });
    await saving;
  });
  expect(replacement.result.current.draft.text).toBe('Original');
});
it('rejects acknowledgements for a different identity and allows resetting the unsaved draft', async () => {
  const adapter = {
    update: vi
      .fn<StudioRecordUpdater<Note>['update']>()
      .mockResolvedValue({ status: 'saved', record: { key: 'other', text: 'Wrong identity' } }),
  };
  const { result } = mount(adapter);
  act(() => result.current.setDraft({ ...initial, text: 'Kept' }));
  await act(() => result.current.save());
  await waitFor(() => expect(result.current.state.status).toBe('unavailable'));
  expect(result.current.draft.text).toBe('Kept');
  act(() => result.current.reset());
  expect(result.current.draft).toEqual(initial);
  expect(result.current.dirty).toBe(false);
});

it('opens a different row after a guarded switch and ignores the previous write acknowledgement', async () => {
  const pending = pendingWrite();
  const adapter = { update: vi.fn<StudioRecordUpdater<Note>['update']>(() => pending.promise) };
  const { result } = mount(adapter);
  let saving: Promise<void> | undefined;
  act(() => {
    saving = result.current.save();
  });
  act(() => result.current.open({ key: 'second', text: 'Second row' }));
  expect(adapter.update.mock.calls[0]?.[1].aborted).toBe(true);
  await act(async () => {
    pending.resolve({ status: 'saved', record: { ...initial, text: 'Old row response' } });
    await saving;
  });
  expect(result.current.draft).toEqual({ key: 'second', text: 'Second row' });
  expect(result.current.dirty).toBe(false);
});
