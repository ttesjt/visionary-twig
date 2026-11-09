import type { ImageAsset } from './image.schema.js';

export function resolveImageSelection<T extends ImageAsset>(
  images: readonly T[],
  currentId: string | null
): { readonly image: T | undefined; readonly index: number } {
  const requested = images.findIndex((image) => image.id === currentId);
  const index = requested >= 0 ? requested : images.length > 0 ? 0 : -1;
  return { image: images[index], index };
}
export function adjacentImageId(
  images: readonly ImageAsset[],
  currentId: string | null,
  offset: -1 | 1,
  loop = false
): string | undefined {
  const { index } = resolveImageSelection(images, currentId);
  if (images.length === 0) return undefined;
  const next = index + offset;
  return images[loop ? (next + images.length) % images.length : next]?.id;
}
export function mediaDatasetKey(images: readonly ImageAsset[]): string {
  return JSON.stringify(images.map((image) => [image.id, image.src]));
}
