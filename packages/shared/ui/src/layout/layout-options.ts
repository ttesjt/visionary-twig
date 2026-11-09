export const SPACES = ['none', 'content', 'section'] as const;
export type Space = (typeof SPACES)[number];
export const DEFAULT_SPACE: Space = 'content';
export const COLLAPSES = ['narrow', 'never'] as const;
export type Collapse = (typeof COLLAPSES)[number];
export const DEFAULT_COLLAPSE: Collapse = 'narrow';
export const ALIGNS = ['start', 'center', 'end', 'stretch'] as const;
export type Align = (typeof ALIGNS)[number];
export const JUSTIFIES = ['start', 'center', 'end', 'between'] as const;
export type Justify = (typeof JUSTIFIES)[number];
export const CONTAINER_WIDTHS = ['reading', 'content', 'full'] as const;
export type ContainerWidth = (typeof CONTAINER_WIDTHS)[number];
export const GRID_COLUMNS = [1, 2, 3, 4] as const;
export type GridColumns = (typeof GRID_COLUMNS)[number];
export const LAYER_POSITIONS = [
  'fill',
  'center',
  'top-start',
  'top-end',
  'bottom-start',
  'bottom-end',
] as const;
export type LayerPosition = (typeof LAYER_POSITIONS)[number];
