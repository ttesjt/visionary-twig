import type {
  ContentDocument,
  ContentData,
  ContentRegistry,
  JsonObject,
  JsonValue,
  PropsIssue,
} from '@frontend/ui-document';

function object(value: JsonValue | undefined): value is JsonObject {
  return (
    value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
  );
}

function array(value: JsonValue | undefined): value is readonly JsonValue[] {
  return Array.isArray(value);
}

function unknownProps(props: JsonObject, allowed: readonly string[]): PropsIssue[] {
  return Object.keys(props)
    .filter((key) => !allowed.includes(key))
    .map((key) => ({ path: [key], message: 'Unknown prop.' }));
}

/** Synthetic contracts exercise the standalone core; real UI schemas belong to puck-adapter. */
export const registry: ContentRegistry = {
  nodes: {
    Heading: {
      validateProps: (props) => [
        ...unknownProps(props, ['id', 'text', 'level']),
        ...(typeof props.text === 'string' && props.text.length > 0
          ? []
          : [{ path: ['text'], message: 'Text must be a non-empty string.' }]),
        ...([1, 2, 3].includes(Number(props.level)) && typeof props.level === 'number'
          ? []
          : [{ path: ['level'], message: 'Expected heading level 1, 2 or 3.' }]),
      ],
      isBindingTarget: (path) => path.length === 1 && (path[0] === 'text' || path[0] === 'level'),
    },
    Layout: {
      slots: [{ path: ['content'], allowedTypes: ['Layout', 'Heading', 'Media'] }],
      validateProps: (props) => unknownProps(props, ['id', 'content']),
      isBindingTarget: () => true,
    },
    Media: {
      validateProps: (props) => {
        const errors = unknownProps(props, ['id', 'images', 'caption']);
        if (props.caption !== null && typeof props.caption !== 'string')
          errors.push({ path: ['caption'], message: 'Expected a nullable caption.' });
        if (!array(props.images)) errors.push({ path: ['images'], message: 'Expected images.' });
        else
          for (const [index, image] of props.images.entries()) {
            if (!object(image) || typeof image.alt !== 'string')
              errors.push({
                path: ['images', String(index), 'alt'],
                message: 'Expected image alt.',
              });
          }
        return errors;
      },
      isBindingTarget: (path) =>
        (path[0] === 'caption' && path.length === 1) ||
        (path[0] === 'images' &&
          (path.length === 1 || path.length === 2 || (path.length === 3 && path[2] === 'alt'))),
    },
  },
};

export function fixture(): ContentDocument {
  return {
    documentId: 'sample-article',
    schemaVersion: 1,
    revision: 1,
    locale: 'en',
    data: {
      root: { props: {} },
      content: [
        {
          type: 'Layout',
          props: {
            id: 'outer',
            content: [
              {
                type: 'Layout',
                props: {
                  id: 'inner',
                  content: [
                    { type: 'Heading', props: { id: 'title', text: '', level: 2 } },
                    {
                      type: 'Media',
                      props: {
                        id: 'media',
                        caption: null,
                        images: [{ alt: 'Original', type: 'not-a-component' }],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
    variables: {
      content: { title: 'Sample article', images: [{ alt: 'An image beside a short paragraph' }] },
    },
    bindings: [{ nodeId: 'title', targetPath: ['text'], sourcePath: ['content', 'title'] }],
  };
}

export function freezeDeep(value: unknown): void {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeDeep(child);
}

export function findProps(data: ContentData, id: string): JsonObject {
  function visit(props: JsonObject): JsonObject | undefined {
    if (props.id === id) return props;
    if (array(props.content)) {
      for (const child of props.content) {
        if (object(child) && object(child.props)) {
          const found = visit(child.props);
          if (found) return found;
        }
      }
    }
    return undefined;
  }
  for (const node of data.content) {
    const found = visit(node.props);
    if (found) return found;
  }
  throw new Error(`Missing fixture node ${id}.`);
}
