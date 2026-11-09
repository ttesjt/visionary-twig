import type { NavigationPresentationCatalog } from '../presentation/catalog.js';
import {
  configurableTitleSchema,
  configurableItemSchema,
  mergeItemRepresentation,
  configurableProgressSchema,
  type NavigationMedia,
} from './schema.js';
function source(media: NavigationMedia | null | undefined): string[] {
  return media?.kind === 'image' ? [media.src] : [];
}
export function configurableTitleMedia(options: unknown): readonly string[] {
  const data = configurableTitleSchema.parse(options);
  return (data.display ?? 'text') !== 'text' || data.compact === 'media' ? source(data.media) : [];
}
export function configurableItemMedia(options: unknown): readonly string[] {
  const data = configurableItemSchema.parse(options);
  const result: string[] = [];
  for (const cycle of data.cycle ?? [{}]) {
    for (const override of [{}, ...Object.values(data.overrides ?? {})]) {
      for (const current of [false, true]) {
        const representation = mergeItemRepresentation([data, cycle, override], current);
        if ((representation.display ?? 'text') !== 'text')
          result.push(...source(representation.media));
      }
    }
  }
  return [...new Set(result)];
}
export function configurableProgressMedia(options: unknown): readonly string[] {
  const data = configurableProgressSchema.parse(options);
  return [
    data,
    ...(data.cycle ?? []),
    ...Object.values(data.sections ?? {}),
    ...(data.stages?.map((stage) => stage.design) ?? []),
  ].flatMap((design) => source(design.marker));
}
export const configurableNavigationDefinitions = {
  title: {
    configurable: { schema: configurableTitleSchema, mediaSources: configurableTitleMedia },
  },
  item: { configurable: { schema: configurableItemSchema, mediaSources: configurableItemMedia } },
  progress: {
    configurable: { schema: configurableProgressSchema, mediaSources: configurableProgressMedia },
  },
} satisfies NavigationPresentationCatalog['parts'];
