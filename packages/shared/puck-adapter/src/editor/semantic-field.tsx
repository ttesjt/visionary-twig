import { useContext, useEffect, useState } from 'react';
import { z } from 'zod';
import { EditorRuntimeContext } from './editor-context.js';

export interface SemanticFieldProps {
  readonly onDraftChange?: (id: string, pending: boolean) => void;
  readonly id: string;
  readonly nodeId?: string;
  /** Stable field identity; DOM IDs can change when the native inspector remounts. */
  readonly draftKey?: string;
  readonly label: string;
  readonly schema: z.ZodType;
  readonly value: unknown;
  readonly readOnly: boolean;
  readonly onChange: (value: unknown) => void;
}

const ignoreDraft = () => {};

export function unwrap(schema: z.ZodType): z.ZodType {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodReadonly ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault
  ) {
    const inner: unknown = schema.unwrap();
    if (inner instanceof z.ZodType) return unwrap(inner);
  }
  return schema;
}

function StructuredField({
  id,
  label,
  schema,
  value,
  readOnly,
  onChange,
  onDraftChange,
  nodeId,
  draftKey,
}: SemanticFieldProps) {
  const encoded = JSON.stringify(value ?? null, null, 2);
  const runtime = useContext(EditorRuntimeContext);
  const store = runtime?.structuredDrafts;
  const key = JSON.stringify([runtime?.fieldScope ?? '', draftKey ?? id]);
  const retained = store?.values.get(key);
  const [source, setSource] = useState(retained?.source ?? encoded);
  const [draft, setDraft] = useState(retained?.text ?? encoded);
  const [error, setError] = useState(retained?.error ?? '');
  const [scope, setScope] = useState(key);
  if (scope !== key) {
    setScope(key);
    setSource(retained?.source ?? encoded);
    setDraft(retained?.text ?? encoded);
    setError(retained?.error ?? '');
  }
  const draftChanged = onDraftChange ?? runtime?.draftChanged ?? ignoreDraft;
  // Native history can change this field without remounting its component.
  if (scope === key && source !== encoded && (!store || !error)) {
    setSource(encoded);
    setDraft(encoded);
    setError('');
  }
  useEffect(() => {
    if (store) return;
    draftChanged(id, Boolean(error));
    return () => draftChanged(id, false);
  }, [id, error, draftChanged, store]);
  function invalid(text: string, message: string): void {
    setError(message);
    store?.set(key, {
      id,
      source,
      text,
      error: message,
      ...(nodeId === undefined ? {} : { nodeId }),
      ...(onDraftChange === undefined ? {} : { notify: onDraftChange }),
    });
  }
  function edit(text: string): void {
    setDraft(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      invalid(text, 'Enter valid JSON.');
      return;
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
      invalid(text, result.error.issues[0]?.message ?? 'Invalid structured value.');
      return;
    }
    setError('');
    store?.set(key, null);
    setSource(JSON.stringify(parsed, null, 2));
    onChange(parsed);
  }
  return (
    <label className="ui-puck-field">
      {label}
      <textarea
        id={id}
        aria-label={label}
        rows={8}
        value={draft}
        readOnly={readOnly}
        onChange={(event) => edit(event.target.value)}
        aria-invalid={Boolean(error)}
      />
      {error && <span role="alert">{error}</span>}
    </label>
  );
}

export function SemanticField(props: SemanticFieldProps) {
  const { id, label, value, readOnly, onChange } = props;
  const schema = unwrap(props.schema);
  if (schema instanceof z.ZodString)
    return (
      <label className="ui-puck-field">
        {label}
        <input
          id={id}
          aria-label={label}
          value={typeof value === 'string' ? value : ''}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  const options: unknown[] =
    schema instanceof z.ZodEnum
      ? schema.options
      : schema instanceof z.ZodLiteral
        ? [...schema.values]
        : schema instanceof z.ZodBoolean
          ? [true, false]
          : [];
  if (options.length)
    return (
      <label className="ui-puck-field">
        {label}
        <select
          id={id}
          aria-label={label}
          disabled={readOnly}
          value={JSON.stringify(value) ?? ''}
          onChange={(event) => {
            const selected: unknown = JSON.parse(event.target.value);
            onChange(selected);
          }}
        >
          <option value="" disabled>
            Default
          </option>
          {options.map((option) => (
            <option key={JSON.stringify(option)} value={JSON.stringify(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      </label>
    );
  if (schema instanceof z.ZodNumber)
    return (
      <label className="ui-puck-field">
        {label}
        <input
          id={id}
          aria-label={label}
          type="number"
          value={typeof value === 'number' ? value : ''}
          readOnly={readOnly}
          onChange={(event) =>
            onChange(event.target.value === '' ? null : event.target.valueAsNumber)
          }
        />
      </label>
    );
  return <StructuredField {...props} />;
}
