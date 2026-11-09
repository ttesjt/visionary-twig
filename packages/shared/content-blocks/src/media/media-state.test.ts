import { describe, expect, it } from 'vitest';
import { adjacentImageId, resolveImageSelection, mediaDatasetKey } from './media-state.js';

const images = [
  { id: 'a', src: '/a.png', alt: 'A', width: 20, height: 10 },
  { id: 'b', src: '/b.png', alt: 'B', width: 20, height: 10 },
];
describe('media selection', () => {
  it('resolves by stable ID and immediately falls back inside the current dataset', () => {
    expect(resolveImageSelection(images, 'b').image?.src).toBe('/b.png');
    expect(resolveImageSelection(images, 'removed').image?.id).toBe('a');
    expect(resolveImageSelection([], 'a')).toEqual({ image: undefined, index: -1 });
  });
  it('does not wrap edges or modify caller data', () => {
    expect(adjacentImageId(images, 'a', -1)).toBeUndefined();
    expect(adjacentImageId(images, 'b', 1)).toBeUndefined();
    expect(adjacentImageId(images, 'removed', 1)).toBe('b');
    expect(mediaDatasetKey(images)).not.toBe(mediaDatasetKey([...images].reverse()));
    expect(images[0]?.id).toBe('a');
  });
});
