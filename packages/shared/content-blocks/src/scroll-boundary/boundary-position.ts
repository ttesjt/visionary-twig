import type { ScrollBoundaryRange, ScrollBoundaryState } from './scroll-boundary.schema.js';

/** Coordinates share the owning document's viewport. Equality belongs to the passed side. */
export function boundaryPosition({
  top,
  bottom,
  line,
  range,
}: {
  readonly top: number;
  readonly bottom: number;
  readonly line: number;
  readonly range: ScrollBoundaryRange;
}): ScrollBoundaryState {
  if (top > line) return 'before';
  if (range === 'within' && bottom <= line) return 'after';
  return 'active';
}
