import { describe, expect, it, vi } from 'vitest';
import { hasRenderableContent } from './content-presence.js';
import type { ContentRegistry } from './contracts.js';

const registry: ContentRegistry = {
  nodes: {
    Layout: {
      slots: [{ path: ['children'] }],
      validateProps: () => [],
      isBindingTarget: () => false,
      hasOwnContent: () => false,
    },
    Custom: { validateProps: () => [], isBindingTarget: () => false },
  },
};
const custom = { type: 'Custom', props: { id: 'leaf' } };
const nested = (children: readonly unknown[]) => ({
  root: {},
  content: [
    {
      type: 'Layout',
      props: { id: 'outer', children: [{ type: 'Layout', props: { id: 'inner', children } }] },
    },
  ],
});

describe('resolved content presence', () => {
  it('distinguishes empty trees and nested structural slots from custom visual content', () => {
    expect(hasRenderableContent({ root: {}, content: [] }, registry)).toEqual({
      ok: true,
      value: false,
    });
    expect(hasRenderableContent(nested([]), registry)).toEqual({ ok: true, value: false });
    expect(hasRenderableContent(nested([custom]), registry)).toEqual({ ok: true, value: true });
  });
  it('retains nonempty validated root properties and explicit visual renderers', () => {
    const visual: ContentRegistry = {
      ...registry,
      validateRootProps: () => [],
      nodes: {
        ...registry.nodes,
        Spacer: {
          validateProps: () => [],
          isBindingTarget: () => false,
          hasOwnContent: () => true,
        },
      },
    };
    expect(
      hasRenderableContent({ root: { props: { background: 'muted' } }, content: [] }, visual)
    ).toEqual({ ok: true, value: true });
    expect(
      hasRenderableContent(
        { root: {}, content: [{ type: 'Spacer', props: { id: 'space' } }] },
        visual
      )
    ).toEqual({ ok: true, value: true });
  });
  it('keeps invalid data as an error and never invokes semantic inspection before validation', () => {
    const own = vi.fn(() => false);
    const invalid: ContentRegistry = {
      nodes: {
        Invalid: {
          validateProps: () => [{ path: ['text'], message: 'Missing text.' }],
          isBindingTarget: () => false,
          hasOwnContent: own,
        },
      },
    };
    expect(
      hasRenderableContent(
        { root: {}, content: [{ type: 'Invalid', props: { id: 'bad' } }] },
        invalid
      ).ok
    ).toBe(false);
    expect(
      hasRenderableContent(
        { root: {}, content: [{ type: 'Unknown', props: { id: 'unknown' } }] },
        registry
      ).ok
    ).toBe(false);
    expect(own).not.toHaveBeenCalled();
  });
});
