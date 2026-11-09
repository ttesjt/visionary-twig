import type { ComponentConfig, Config, CustomField, SlotField } from '@puckeditor/core';
import { z } from 'zod';
import {
  COMPONENT_NAMES,
  componentSchemas,
  hasContentSlot,
  slotAllowedTypes,
  SLOT_PROP,
} from '../registry/catalog.js';
import { serverConfig } from '../config/server-config.js';
import { editorDefaults } from './defaults.js';
import { useEditorRuntime } from './editor-context.js';
import { RuntimeField } from './runtime-field.js';

function withResolvedPreview(
  name: string,
  render: ComponentConfig['render']
): ComponentConfig['render'] {
  return function ResolvedPreview(props) {
    const runtime = useEditorRuntime();
    const resolved = runtime.propsById.get(props.id);
    if (runtime.issues.length || !resolved)
      return <p role="alert">Content preview requires a valid document.</p>;
    const businessProps = Object.fromEntries(
      Object.entries(resolved).filter(
        ([key]) => key !== 'id' && !(hasContentSlot(name) && key === SLOT_PROP)
      )
    );
    return render({ ...props, ...businessProps });
  };
}

/** Puck edits raw data; variables resolve only in the render projection. */
export const editorConfig: Config = {
  root: {
    fields: {},
    defaultProps: {},
    render: ({ children }: { children: React.ReactNode }) => (
      <div className="ui-puck-canvas-content">{children}</div>
    ),
  },
  components: Object.fromEntries(
    COMPONENT_NAMES.map((name) => {
      const component = serverConfig.components[name];
      if (!component) throw new Error(`Missing renderer for ${name}.`);
      return [
        name,
        {
          ...component,
          label: name,
          defaultProps: editorDefaults[name],
          render: withResolvedPreview(name, component.render),
          resolveFields: (data: { props: { id: string } }) => {
            const fields: Record<string, CustomField<unknown> | SlotField> = {};
            for (const [key, candidate] of Object.entries(componentSchemas[name].shape)) {
              const schema: unknown = candidate;
              if (!(schema instanceof z.ZodType))
                throw new Error('Invalid registered field schema.');
              fields[key] = {
                type: 'custom',
                render: (props) => (
                  <RuntimeField
                    nodeId={data.props.id}
                    name={key}
                    id={props.id}
                    schema={schema}
                    value={props.value}
                    readOnly={props.readOnly ?? false}
                    onChange={props.onChange}
                  />
                ),
              };
            }
            if (hasContentSlot(name))
              fields[SLOT_PROP] = { type: 'slot', allow: [...slotAllowedTypes(name)] };
            return fields;
          },
        },
      ];
    })
  ),
};
