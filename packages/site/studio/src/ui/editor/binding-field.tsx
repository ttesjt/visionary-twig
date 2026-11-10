import { Button } from '@frontend/ui';
import { formatText } from '@frontend/text-catalog';
import { useState } from 'react';
import { z } from 'zod';
import { SemanticField, unwrap } from '@frontend/puck-adapter/fields';
import type { EditorFieldProps } from '@frontend/puck-adapter/fields';
import { readJsonPath } from '@frontend/ui-document/inspection';
import {
  parseVariablePath,
  formatVariablePath,
  bindProjectField,
  unbindProjectField,
  validateBoundValue,
  setBindingSourceValue,
  projectContext,
} from '../../data/index.js';
import type { ProjectSession } from '../session/use-project-session.js';
import type { ContentBinding } from '@frontend/ui-document';
import { useStudioTextCatalog } from '../text/context.js';
function schemaAtPath(schema: z.ZodType, path: readonly string[]): z.ZodType {
  let current = unwrap(schema);
  for (const segment of path) {
    const candidate: unknown =
      current instanceof z.ZodObject
        ? current.shape[segment]
        : current instanceof z.ZodArray
          ? current.element
          : undefined;
    if (!(candidate instanceof z.ZodType)) return z.json();
    current = unwrap(candidate);
  }
  return current;
}
function BoundValue({
  binding,
  field,
  session,
}: {
  readonly binding: ContentBinding;
  readonly field: EditorFieldProps;
  readonly session: ProjectSession;
}) {
  const componentText = useStudioTextCatalog();
  const project = session.project;
  const context = {
    ...project.document.variables,
    ...projectContext(project, session.state.locale),
  };
  const value = readJsonPath(context, binding.sourcePath);
  return (
    <div className="ui-studio-bound-value">
      <p>
        {componentText.bindingSource}: {formatVariablePath(binding.sourcePath)}
      </p>
      <output aria-label={formatText(componentText.resolvedValue, { label: field.label })}>
        {JSON.stringify(value)}
      </output>
      <SemanticField
        id={field.id + ':bound:' + JSON.stringify(binding.targetPath)}
        nodeId={field.nodeId}
        draftKey={JSON.stringify([field.nodeId, binding.targetPath, binding.sourcePath])}
        label={componentText.catalogValue + ' · ' + formatVariablePath(binding.sourcePath)}
        schema={schemaAtPath(field.schema, binding.targetPath.slice(1))}
        value={value}
        readOnly={field.readOnly}
        onChange={(input) => {
          const json = z.json().safeParse(input);
          if (!json.success) return;
          const checked = validateBoundValue(
            project,
            binding.nodeId,
            binding.targetPath,
            json.data,
            session.state.locale,
            session.registry
          );
          if (!checked.ok) {
            session.setIssues(checked.errors);
            return;
          }
          session.run(
            setBindingSourceValue(
              project,
              binding.sourcePath,
              json.data,
              session.state.locale,
              session.registry
            )
          );
        }}
      />
      <p>{componentText.sharedKeyNotice}</p>
      <p>{componentText.unbindWarning}</p>
      <Button
        type="button"
        disabled={field.readOnly || value === undefined || !session.flags.canSave}
        onClick={() =>
          session.run(
            unbindProjectField(
              project,
              binding.nodeId,
              binding.targetPath,
              session.state.locale,
              session.registry
            )
          )
        }
      >
        {componentText.unbindVariable}
      </Button>
    </div>
  );
}
export function BindingField({
  session,
  ...field
}: EditorFieldProps & { readonly session: ProjectSession }) {
  const componentText = useStudioTextCatalog();
  const [mode, setMode] = useState<'direct' | 'binding'>('direct');
  const [path, setPath] = useState('');
  const project = session.project;
  const bindings = (project.document.bindings ?? []).filter(
    (binding) => binding.nodeId === field.nodeId && binding.targetPath[0] === field.name
  );
  function bind(create: boolean) {
    const parsed = parseVariablePath(path);
    if (!parsed.ok) {
      session.setIssues(parsed.errors);
      return;
    }
    let next = project;
    const existing = readJsonPath(
      { ...project.document.variables, ...projectContext(project, session.state.locale) },
      parsed.value
    );
    if (create) {
      if (existing !== undefined) {
        session.setIssues([
          {
            code: 'existing-key',
            path: parsed.value,
            message: 'Choose the existing key or enter a new key.',
          },
        ]);
        return;
      }
      const value = z.json().safeParse(field.value);
      if (!value.success) return;
      const created = setBindingSourceValue(
        project,
        parsed.value,
        value.data,
        session.state.locale,
        session.registry
      );
      if (!created.ok) {
        session.setIssues(created.errors);
        return;
      }
      next = created.value;
    } else if (existing !== undefined) {
      const check = validateBoundValue(
        project,
        field.nodeId,
        [field.name],
        existing,
        session.state.locale,
        session.registry
      );
      if (!check.ok) {
        session.setIssues(check.errors);
        return;
      }
    }
    session.run(bindProjectField(next, field.nodeId, [field.name], parsed.value, session.registry));
    setMode('direct');
  }
  return (
    <div className="ui-studio-binding-field">
      {bindings.length ? (
        bindings.map((binding) => (
          <BoundValue
            key={JSON.stringify(binding.targetPath)}
            binding={binding}
            field={field}
            session={session}
          />
        ))
      ) : (
        <>
          <label>
            {componentText.fieldMode}
            <select
              aria-label={componentText.fieldMode + ' · ' + field.label}
              disabled={field.readOnly || !session.flags.canSave}
              value={mode}
              onChange={(event) => setMode(event.target.value === 'binding' ? 'binding' : 'direct')}
            >
              <option value="direct">{componentText.directValue}</option>
              <option value="binding">{componentText.variableValue}</option>
            </select>
          </label>
          {mode === 'direct' ? (
            <SemanticField {...field} />
          ) : (
            <>
              <label>
                {componentText.variablePath}
                <input
                  aria-label={componentText.variablePath + ' · ' + field.label}
                  value={path}
                  onChange={(event) => setPath(event.target.value)}
                />
              </label>
              <p>{componentText.keyHelp}</p>
              <Button
                type="button"
                disabled={field.readOnly || !session.flags.canSave}
                onClick={() => bind(false)}
              >
                {componentText.bindVariable}
              </Button>
              <Button
                type="button"
                disabled={field.readOnly || !session.flags.canSave}
                onClick={() => bind(true)}
              >
                {componentText.createAndBind}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
