import { useEditorPuck } from './use-editor-puck.js';
import type { z } from 'zod';
import { toPuckData } from '../config/puck-data.js';
import { useEditorRuntime } from './editor-context.js';
import { SemanticField } from './semantic-field.js';

export function RuntimeField({
  nodeId,
  name,
  id,
  schema,
  value,
  readOnly,
  onChange,
}: {
  readonly nodeId: string;
  readonly name: string;
  readonly id: string;
  readonly schema: z.ZodType;
  readonly value: unknown;
  readonly readOnly: boolean;
  readonly onChange: (value: unknown) => void;
}) {
  const runtime = useEditorRuntime();
  const dispatch = useEditorPuck((state) => state.dispatch);
  const draftKey = JSON.stringify([nodeId, name]);
  const bindings = (runtime.document.bindings ?? []).filter(
    (binding) => binding.nodeId === nodeId && binding.targetPath[0] === name
  );
  const label = `${name} (${nodeId})`;
  if (runtime.fieldEditor)
    return runtime.fieldEditor({
      nodeId,
      name,
      id,
      draftKey,
      schema,
      value,
      readOnly,
      onChange,
      label,
    });
  if (!bindings.length)
    return (
      <SemanticField
        key={`${nodeId}:${name}`}
        id={id}
        nodeId={nodeId}
        draftKey={draftKey}
        label={label}
        schema={schema}
        value={value}
        readOnly={readOnly}
        onChange={onChange}
      />
    );
  return (
    <fieldset className="ui-puck-bound-field">
      <legend>{label}</legend>
      <output aria-label={`Resolved ${label}`}>
        {JSON.stringify(runtime.propsById.get(nodeId)?.[name])}
      </output>
      {bindings.map((binding) => (
        <div key={JSON.stringify(binding.targetPath)}>
          <p>
            Bound to {binding.sourcePath.join('.')} → {binding.targetPath.join('.')}
          </p>
          <button
            type="button"
            disabled={runtime.issues.length > 0 || readOnly}
            onClick={() => {
              const result = runtime.unbind(nodeId, binding.targetPath);
              if (result.ok)
                dispatch({
                  type: 'setData',
                  data: toPuckData(result.value.data),
                  recordHistory: true,
                });
            }}
          >
            Unbind {binding.targetPath.join('.')} using current value
          </button>
        </div>
      ))}
    </fieldset>
  );
}
