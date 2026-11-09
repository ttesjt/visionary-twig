import { z } from 'zod';
import {
  DEFAULT_NAVIGATION_PRESENTATION,
  NAVIGATION_PARTS,
  navigationPresentationSchema,
  navigationPartSelectionSchema,
  type NavigationPart,
  type NavigationPartSelection,
  type NavigationPresentation,
} from './presentation.schema.js';
export interface NavigationPartDefinition {
  readonly schema: z.ZodType;
  /** Only resources actually consumed by this part grant host media access. */
  readonly mediaSources?: (options: unknown) => readonly string[];
}
export type NavigationPartSelections = Readonly<Record<NavigationPart, NavigationPartSelection>>;
export interface NavigationPresetDefinition {
  readonly schema: z.ZodType;
  /** When supplied, only listed replacements are accepted; an omitted slot is closed. */
  readonly overrides?: Readonly<Partial<Record<NavigationPart, readonly string[]>>>;
  /** Receives validated raw options; defineNavigationPreset parses into its typed callback. */
  readonly resolve: (options: unknown) => NavigationPartSelections;
}
export interface NavigationPresentationCatalog {
  readonly parts: Readonly<
    Record<NavigationPart, Readonly<Record<string, NavigationPartDefinition>>>
  >;
  readonly presets: Readonly<Record<string, NavigationPresetDefinition>>;
}
export interface NavigationPresentationIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
}
export interface ResolvedNavigationPresentation {
  readonly preset: string;
  readonly parts: Readonly<
    Record<NavigationPart, { readonly id: string; readonly options: unknown }>
  >;
}
export function defineNavigationPreset<T>(
  schema: z.ZodType<T>,
  resolve: (options: T) => NavigationPartSelections,
  overrides?: Readonly<Partial<Record<NavigationPart, readonly string[]>>>
): NavigationPresetDefinition {
  return {
    schema,
    resolve: (options) => resolve(schema.parse(options)),
    ...(overrides ? { overrides } : {}),
  };
}
const emptyOptions = z.strictObject({});
const defaultPart = { schema: emptyOptions };
const defaults: NavigationPartSelections = {
  title: { id: DEFAULT_NAVIGATION_PRESENTATION },
  item: { id: DEFAULT_NAVIGATION_PRESENTATION },
  progress: { id: DEFAULT_NAVIGATION_PRESENTATION },
};
export const defaultNavigationCatalog: NavigationPresentationCatalog = {
  parts: {
    title: { default: defaultPart },
    item: { default: defaultPart },
    progress: { default: defaultPart },
  },
  presets: { default: defineNavigationPreset(emptyOptions, () => defaults) },
};
/** Extension never replaces the neutral fallback. Schemas stay server/browser safe. */
export function createNavigationCatalog(
  extension: NavigationPresentationCatalog
): NavigationPresentationCatalog {
  for (const map of [extension.presets, ...NAVIGATION_PARTS.map((part) => extension.parts[part])]) {
    if (Object.hasOwn(map, DEFAULT_NAVIGATION_PRESENTATION))
      throw new Error('The default navigation presentation is reserved.');
  }
  return {
    presets: Object.freeze({ ...defaultNavigationCatalog.presets, ...extension.presets }),
    parts: {
      title: Object.freeze({ ...defaultNavigationCatalog.parts.title, ...extension.parts.title }),
      item: Object.freeze({ ...defaultNavigationCatalog.parts.item, ...extension.parts.item }),
      progress: Object.freeze({
        ...defaultNavigationCatalog.parts.progress,
        ...extension.parts.progress,
      }),
    },
  };
}
function own<T>(map: Readonly<Record<string, T>>, id: string): T | undefined {
  return Object.hasOwn(map, id) ? map[id] : undefined;
}
function optionIssues(
  error: z.ZodError,
  path: readonly (string | number)[]
): NavigationPresentationIssue[] {
  return error.issues.map((issue) => ({
    path: [...path, ...issue.path.map((part) => (typeof part === 'number' ? part : String(part)))],
    message: issue.message,
  }));
}
export function inspectNavigationPresentation(
  input: NavigationPresentation | undefined,
  catalog: NavigationPresentationCatalog = defaultNavigationCatalog
):
  | { readonly ok: true; readonly value: ResolvedNavigationPresentation }
  | { readonly ok: false; readonly issues: readonly NavigationPresentationIssue[] } {
  const parsed = navigationPresentationSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false, issues: optionIssues(parsed.error, []) };
  const data = parsed.data;
  const preset = data.preset ?? DEFAULT_NAVIGATION_PRESENTATION;
  const definition = own(catalog.presets, preset);
  if (!definition)
    return {
      ok: false,
      issues: [{ path: ['preset'], message: `Unknown navigation preset: ${preset}` }],
    };
  const options = definition.schema.safeParse(data.options ?? {});
  if (!options.success) return { ok: false, issues: optionIssues(options.error, ['options']) };
  const selection = { ...definition.resolve(data.options ?? {}), ...data.parts };
  const issues: NavigationPresentationIssue[] = [];
  const parts: Record<NavigationPart, { readonly id: string; readonly options: unknown }> = {
    title: { id: 'default', options: {} },
    item: { id: 'default', options: {} },
    progress: { id: 'default', options: {} },
  };
  for (const part of NAVIGATION_PARTS) {
    const chosen = navigationPartSelectionSchema.safeParse(selection[part]);
    if (!chosen.success) {
      issues.push(...optionIssues(chosen.error, ['parts', part]));
      continue;
    }
    if (
      data.parts?.[part] &&
      definition.overrides &&
      !definition.overrides[part]?.includes(chosen.data.id)
    ) {
      issues.push({
        path: ['parts', part, 'id'],
        message: `Preset ${preset} does not allow replacing ${part} with ${chosen.data.id}.`,
      });
      continue;
    }
    const entry = own(catalog.parts[part], chosen.data.id);
    if (!entry) {
      issues.push({
        path: ['parts', part, 'id'],
        message: `Unknown navigation ${part} part: ${chosen.data.id}`,
      });
      continue;
    }
    const value = entry.schema.safeParse(chosen.data.options ?? {});
    if (!value.success) issues.push(...optionIssues(value.error, ['parts', part, 'options']));
    else parts[part] = { id: chosen.data.id, options: value.data };
  }
  return issues.length ? { ok: false, issues } : { ok: true, value: { preset, parts } };
}
export function resolveNavigationPresentation(
  input: NavigationPresentation | undefined,
  catalog: NavigationPresentationCatalog = defaultNavigationCatalog
): ResolvedNavigationPresentation {
  const result = inspectNavigationPresentation(input, catalog);
  if (!result.ok)
    throw new Error(
      result.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    );
  return result.value;
}
export function navigationPresentationMedia(
  input: NavigationPresentation | undefined,
  catalog: NavigationPresentationCatalog = defaultNavigationCatalog
): readonly string[] {
  const resolved = resolveNavigationPresentation(input, catalog);
  return [
    ...new Set(
      NAVIGATION_PARTS.flatMap((part) => {
        const selection = resolved.parts[part];
        return catalog.parts[part][selection.id]?.mediaSources?.(selection.options) ?? [];
      })
    ),
  ];
}
