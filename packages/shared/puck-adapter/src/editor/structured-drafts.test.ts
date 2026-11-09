import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useStructuredDrafts } from './structured-drafts.js';

it('retains independently scoped invalid buffers until repair and prunes only deleted owners', () => {
  const notify = vi.fn();
  const { result, rerender } = renderHook(({ ids }) => useStructuredDrafts(ids), {
    initialProps: { ids: new Set(['one', 'two']) },
  });
  act(() => {
    result.current.set('en:one', {
      id: 'field',
      nodeId: 'one',
      source: '[]',
      text: '{unfinished',
      error: 'Invalid JSON',
      notify,
    });
    result.current.set('zh:one', {
      id: 'field',
      nodeId: 'one',
      source: '[]',
      text: '[unfinished',
      error: 'Invalid JSON',
    });
    result.current.set('en:two', {
      id: 'other',
      nodeId: 'two',
      source: '[]',
      text: '{kept',
      error: 'Invalid JSON',
    });
  });
  expect(result.current.values.size).toBe(3);
  expect(notify).toHaveBeenLastCalledWith('field', true);
  act(() => result.current.set('zh:one', null));
  expect(result.current.values.get('en:one')?.text).toBe('{unfinished');
  rerender({ ids: new Set(['two']) });
  expect(result.current.values.size).toBe(1);
  expect(result.current.values.get('en:two')?.text).toBe('{kept');
  expect(notify).toHaveBeenLastCalledWith('field', false);
});
