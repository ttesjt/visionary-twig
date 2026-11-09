import { anchorNameSchema } from '@frontend/content-blocks/schema';
import type { ContentData, JsonObject, JsonValue } from '@frontend/ui-document';
import { isJsonObject } from '@frontend/ui-document/inspection';

const SCOPE_SEPARATOR = '--';
const navigationScopeSchema = anchorNameSchema.refine(
  (scope) => !scope.includes(SCOPE_SEPARATOR),
  'Navigation scopes must not contain the reserved -- separator.'
);

/** Hosts rendering multiple documents together can explicitly namespace their fragments.
 * No prefix is added by default: bookmarks remain simple and stable. */
export function scopeNavigation(data: ContentData, scope: string): ContentData {
  navigationScopeSchema.parse(scope);
  const qualify = (name: string) => `${scope}${SCOPE_SEPARATOR}${name}`;
  function mapValue(value: JsonValue): JsonValue {
    if (Array.isArray(value)) return value.map(mapValue);
    if (!isJsonObject(value)) return value;
    const mapped = mapObject(value);
    if (
      value.type === 'Anchor' &&
      isJsonObject(mapped.props) &&
      typeof mapped.props.name === 'string'
    ) {
      return { ...mapped, props: { ...mapped.props, name: qualify(mapped.props.name) } };
    }
    return mapped;
  }
  function mapObject(value: JsonObject): JsonObject {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        key === 'href' && typeof child === 'string' && child.startsWith('#')
          ? `#${qualify(child.slice(1))}`
          : mapValue(child),
      ])
    );
  }
  return {
    ...data,
    content: data.content.map((node) => ({
      ...node,
      props: {
        ...mapObject(node.props),
        id: node.props.id,
        ...(node.type === 'Anchor' && typeof node.props.name === 'string'
          ? { name: qualify(node.props.name) }
          : {}),
      },
    })),
  };
}
