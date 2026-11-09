import { z } from 'zod';
import {
  contentNavigationPropsSchema,
  defaultNavigationCatalog,
  inspectNavigationPresentation,
  navigationPresentationMedia,
  type NavigationPresentationCatalog,
} from '@frontend/content-blocks/schema';
import { componentHasOwnContent } from './content-presence.js';
import { componentPublicProps } from './component-props.js';
import { componentMediaSources } from './media-sources.js';
import type { ContentRegistry, NodeContract } from '@frontend/ui-document';
import {
  DOCUMENT_COMPONENT_NAMES,
  documentComponentSchemas,
  hasDocumentContentSlot,
  documentSlotAllowedTypes,
  SLOT_PROP,
} from './catalog.js';
import { validateNavigation } from './navigation/validate-navigation.js';
import { schemaAllowsPath } from './schema-path.js';

const idSchema = z.string().trim().min(1);
/** Hosts inject their own presentation definitions; no website preset enters shared code. */
export function createContentRegistry({
  navigationPresentations = defaultNavigationCatalog,
}: {
  readonly navigationPresentations?: NavigationPresentationCatalog;
} = {}): ContentRegistry {
  const nodes: Record<string, NodeContract> = {};
  for (const name of DOCUMENT_COMPONENT_NAMES) {
    const schema = documentComponentSchemas[name];
    const slots = hasDocumentContentSlot(name)
      ? [{ path: [SLOT_PROP], allowedTypes: documentSlotAllowedTypes(name) }]
      : [];
    const propsSchema = schema.extend({
      id: idSchema,
      ...(slots.length ? { [SLOT_PROP]: z.array(z.json()) } : {}),
    });
    nodes[name] = {
      hasOwnContent: (props) => componentHasOwnContent(name, props),
      slots,
      mediaSources: (props) => {
        if (name !== 'ContentNavigation') return componentMediaSources(name, props);
        const data = componentPublicProps(props);
        return navigationPresentationMedia(
          contentNavigationPropsSchema.parse(data).presentation,
          navigationPresentations
        );
      },
      isBindingTarget: (path) => schemaAllowsPath(schema, path),
      validateProps: (props) => {
        const result = propsSchema.safeParse(props);
        if (!result.success)
          return result.error.issues.map((issue) => ({
            path: issue.path.map(String),
            message: issue.message,
          }));
        if (name !== 'ContentNavigation') return [];
        const data = componentPublicProps(props);
        const navigation = contentNavigationPropsSchema.parse(data);
        const inspected = inspectNavigationPresentation(
          navigation.presentation,
          navigationPresentations
        );
        return inspected.ok
          ? []
          : inspected.issues.map((issue) => ({
              path: ['presentation', ...issue.path.map(String)],
              message: issue.message,
            }));
      },
    };
  }
  return {
    nodes: Object.freeze(nodes),
    validateData: validateNavigation,
  };
}
export const contentRegistry = createContentRegistry();
