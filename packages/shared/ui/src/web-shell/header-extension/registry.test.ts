import { describe, expect, it } from 'vitest';
import { HeaderExtensionRegistry } from './registry.js';

describe('exclusive Header ownership', () => {
  it('replaces without a stack and prevents obsolete release/update from changing the current slot', () => {
    const registry = new HeaderExtensionRegistry();
    const first = registry.register({ content: 'First' });
    const second = registry.register({ content: 'Second' });
    expect(first.signal.aborted).toBe(true);
    first.release();
    expect(first.update({ content: 'Obsolete' })).toBe(false);
    expect(registry.snapshot()?.content).toBe('Second');
    second.release();
    expect(registry.snapshot()).toBeNull();
    expect(second.update({ content: 'Returned' })).toBe(false);
    expect(registry.snapshot()).toBeNull();
  });
  it('keeps one owner across updates and invalidates outstanding callbacks when its resource ends', async () => {
    const registry = new HeaderExtensionRegistry();
    const lease = registry.register({ content: 'Loading' });
    const owner = registry.snapshot()?.owner;
    expect(lease.update({ content: 'Ready', visible: false })).toBe(true);
    expect(registry.snapshot()).toMatchObject({ owner, content: 'Ready', visible: false });
    const pending = Promise.resolve().then(() => lease.update({ content: 'Late' }));
    registry.clear();
    const next = registry.register({ content: 'Next' });
    expect(await pending).toBe(false);
    expect(registry.snapshot()?.content).toBe('Next');
    next.release();
  });
  it('replaces both slots and their density as one value, without retaining omitted options', () => {
    const registry = new HeaderExtensionRegistry();
    const first = registry.register({ content: 'First', bottom: 'First footer', density: 'flush' });
    const second = registry.register({
      content: 'Second',
      bottom: 'Second footer',
      density: 'comfortable',
    });
    first.release();
    expect(first.update({ content: 'Late', bottom: 'Late footer', density: 'flush' })).toBe(false);
    expect(registry.snapshot()).toMatchObject({
      content: 'Second',
      bottom: 'Second footer',
      density: 'comfortable',
    });
    const owner = registry.snapshot()?.owner;
    second.update({ content: 'Plain' });
    expect(registry.snapshot()).toEqual({ content: 'Plain', owner });
    second.release();
    expect(registry.snapshot()).toBeNull();
  });
  it('revokes ownership before abort callbacks execute', () => {
    const registry = new HeaderExtensionRegistry();
    const first = registry.register({ content: 'First' });
    first.signal.addEventListener('abort', () => {
      expect(first.update({ content: 'Late abort result' })).toBe(false);
      first.release();
    });
    registry.register({ content: 'Second' });
    expect(registry.snapshot()?.content).toBe('Second');
  });
});
