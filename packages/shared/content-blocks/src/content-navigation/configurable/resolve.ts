import {
  NAVIGATION_PROGRESS_DEFAULTS,
  configurableItemSchema,
  mergeItemRepresentation,
  configurableProgressSchema,
  type NavigationAppearance,
  type NavigationItemDesign,
  type NavigationProgressDesign,
} from './schema.js';

export function appearanceAttributes(appearance: NavigationAppearance) {
  return {
    'data-palette': appearance.palette,
    'data-color': appearance.color ?? 'inherit',
    'data-background': appearance.background ?? 'transparent',
    'data-border-color': appearance.borderColor ?? 'line',
    'data-border-width': appearance.borderWidth ?? 'none',
    'data-radius': appearance.radius ?? 'none',
    'data-underline': appearance.underline ?? false,
    'data-font': appearance.font ?? 'system',
    'data-weight': appearance.weight ?? 'medium',
  };
}
export interface ResolvedNavigationItem {
  readonly representation: NonNullable<NavigationItemDesign['representation']>;
  readonly appearance: NavigationAppearance;
}
export interface ResolvedNavigationProgress extends NavigationProgressDesign {
  readonly height: number;
  readonly markerSize: number;
}
export function resolveItemDesign(
  options: unknown,
  href: string,
  index: number,
  current: boolean
): ResolvedNavigationItem {
  const data = configurableItemSchema.parse(options);
  const layers: readonly NavigationItemDesign[] = [
    data,
    data.cycle?.[index % data.cycle.length] ?? {},
    data.overrides?.[href] ?? {},
  ];
  const representation = mergeItemRepresentation(layers, current);
  const appearance = layers.reduce<NavigationAppearance>((result, layer) => {
    const { representation: stateRepresentation, ...stateAppearance } =
      (current ? layer.selected : layer.unselected) ?? {};
    void stateRepresentation;
    return { ...result, ...layer.base, ...stateAppearance };
  }, {});
  return { representation, appearance };
}
export function resolveProgressDesign(
  options: unknown,
  href: string,
  currentIndex: number,
  progress: number
): ResolvedNavigationProgress {
  const data = configurableProgressSchema.parse(options);
  const stage = data.stages?.findLast((stage) => progress >= stage.at)?.design;
  const design = {
    ...NAVIGATION_PROGRESS_DEFAULTS,
    ...data,
    ...data.cycle?.[currentIndex % data.cycle.length],
    ...stage,
    ...data.sections?.[href],
  };
  return {
    ...design,
    height: design.height ?? NAVIGATION_PROGRESS_DEFAULTS.height,
    markerSize: design.markerSize ?? NAVIGATION_PROGRESS_DEFAULTS.markerSize,
  };
}
