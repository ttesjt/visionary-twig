import { Button } from '@frontend/ui';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';
import { applyHistoryShortcut, SemanticField } from '@frontend/puck-adapter/fields';
import { projectHistoryControls } from '../session/history-controls.js';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import { readJsonPath } from '@frontend/ui-document/inspection';
import {
  catalogEntries,
  catalogReferences,
  setCatalogValue,
  renameCatalogKey,
  deleteCatalogKey,
  parseVariablePath,
  formatVariablePath,
  parseProject,
  localeSchema,
} from '../../data/index.js';
import type { JsonValue } from '@frontend/ui-document';
import type { ProjectSession } from '../session/use-project-session.js';
import { useStudioTextCatalog } from '../text/context.js';
export function CatalogPanel({
  session,
  actions,
}: {
  readonly session: ProjectSession;
  readonly actions?: ReactNode;
}) {
  const componentText = useStudioTextCatalog();
  const { project, state } = session;
  const [valueMode, setValueMode] = useState<'text' | 'json'>('text');
  const [selected, setSelected] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newLocale, setNewLocale] = useState('');
  const keys = [
    ...new Set(
      Object.values(project.catalogs).flatMap((catalog) =>
        catalogEntries(catalog).map((entry) => formatVariablePath(entry.path))
      )
    ),
  ];
  const parsed = parseVariablePath(selected);
  const path = parsed.ok ? parsed.value : [];
  const value = path.length ? readJsonPath(project.catalogs[state.locale] ?? {}, path) : undefined;
  const references = path.length ? catalogReferences(project, path) : [];
  const draftChanged = session.setDraft;
  function applyValue(value: JsonValue) {
    if (path.length)
      session.run(setCatalogValue(project, state.locale, path, value, contentRegistry));
  }
  return (
    <section
      className="ui-studio-catalog"
      aria-label={componentText.catalogTitle}
      onKeyDownCapture={(event) =>
        applyHistoryShortcut(event, projectHistoryControls(session, componentText))
      }
    >
      <h2>{componentText.catalogTitle}</h2>
      <div className="ui-studio-actions">
        <label>
          {componentText.language}
          <select
            aria-label={componentText.language}
            disabled={!session.flags.canSave}
            value={state.locale}
            onChange={(event) => session.dispatch({ type: 'locale', locale: event.target.value })}
          >
            {[
              ...new Set([
                project.metadata.defaultLocale,
                state.locale,
                ...Object.keys(project.catalogs),
              ]),
            ].map((locale) => (
              <option key={locale} value={locale}>
                {locale}
              </option>
            ))}
          </select>
        </label>
        <label>
          {componentText.newLanguage}
          <input
            aria-label={componentText.newLanguage}
            value={newLocale}
            onChange={(event) => setNewLocale(event.target.value)}
          />
        </label>
        <Button
          type="button"
          disabled={!session.flags.canSave}
          onClick={() => {
            if (!localeSchema.safeParse(newLocale).success) {
              session.setIssues([
                {
                  code: 'invalid-locale',
                  path: ['catalogs'],
                  message: 'Enter a valid language tag.',
                },
              ]);
              return;
            }
            if (!Object.hasOwn(project.catalogs, newLocale))
              session.run(
                parseProject(
                  { ...project, catalogs: { ...project.catalogs, [newLocale]: {} } },
                  contentRegistry
                )
              );
            session.dispatch({ type: 'locale', locale: newLocale });
            setNewLocale('');
          }}
        >
          {componentText.addLanguage}
        </Button>
        <Button
          type="button"
          disabled={!session.flags.canSave || state.locale === project.metadata.defaultLocale}
          onClick={() =>
            session.run(
              parseProject(
                { ...project, metadata: { ...project.metadata, defaultLocale: state.locale } },
                contentRegistry
              )
            )
          }
        >
          {componentText.makeDefault}
        </Button>
        <span>
          {componentText.defaultLanguage}: {project.metadata.defaultLocale}
        </span>
        {actions}
      </div>
      <div className="ui-studio-catalog-grid">
        <ul className="ui-studio-key-list" aria-label={componentText.catalogKeys}>
          {keys.map((key) => {
            const path = parseVariablePath(key);
            const missing =
              path.ok &&
              readJsonPath(project.catalogs[state.locale] ?? {}, path.value) === undefined;
            return (
              <li key={key}>
                <Button
                  type="button"
                  disabled={!session.flags.canSave}
                  aria-current={selected === key ? 'true' : undefined}
                  onClick={() => {
                    setSelected(key);
                    setNewKey(key);
                    const path = parseVariablePath(key);
                    const value = path.ok
                      ? readJsonPath(project.catalogs[state.locale] ?? {}, path.value)
                      : undefined;
                    setValueMode(
                      typeof value === 'string' || value === undefined ? 'text' : 'json'
                    );
                  }}
                >
                  {key}
                  {missing && <span> — {componentText.missingTranslation}</span>}
                </Button>
              </li>
            );
          })}
        </ul>
        <div className="ui-studio-key-editor">
          <label>
            {componentText.catalogKey}
            <input
              aria-label={componentText.catalogKey}
              value={newKey}
              onChange={(event) => setNewKey(event.target.value)}
            />
          </label>
          <p>{componentText.keyHelp}</p>
          <div className="ui-studio-actions">
            <Button
              type="button"
              disabled={!session.flags.canSave}
              onClick={() => {
                const parsed = parseVariablePath(newKey);
                if (!parsed.ok) {
                  session.setIssues(parsed.errors);
                  return;
                }
                if (
                  readJsonPath(project.catalogs[state.locale] ?? {}, parsed.value) !== undefined
                ) {
                  session.setIssues([
                    {
                      code: 'existing-key',
                      path: parsed.value,
                      message: 'Choose a different key. Existing content was preserved.',
                    },
                  ]);
                  return;
                }
                if (
                  session.run(
                    setCatalogValue(project, state.locale, parsed.value, '', contentRegistry)
                  )
                )
                  setSelected(newKey);
              }}
            >
              {componentText.createKey}
            </Button>
            <Button
              type="button"
              disabled={!session.flags.canSave || !path.length}
              onClick={() => {
                const next = parseVariablePath(newKey);
                if (!next.ok) {
                  session.setIssues(next.errors);
                  return;
                }
                if (session.run(renameCatalogKey(project, path, next.value, contentRegistry)))
                  setSelected(newKey);
              }}
            >
              {componentText.renameKey}
            </Button>
            <Button
              type="button"
              disabled={!session.flags.canSave || !path.length || references.length > 0}
              onClick={() => {
                if (session.run(deleteCatalogKey(project, path, contentRegistry))) setSelected('');
              }}
            >
              {componentText.deleteKey}
            </Button>
          </div>
          {path.length > 0 && (
            <>
              {value === undefined && <p role="status">{componentText.missingTranslation}</p>}
              <label>
                {componentText.valueMode}
                <select
                  aria-label={componentText.valueMode}
                  disabled={!session.flags.canSave}
                  value={valueMode}
                  onChange={(event) =>
                    setValueMode(event.target.value === 'json' ? 'json' : 'text')
                  }
                >
                  <option value="text">{componentText.textValue}</option>
                  <option value="json">{componentText.jsonValue}</option>
                </select>
              </label>
              <SemanticField
                key={valueMode + selected + ':' + state.locale}
                id="catalog-value"
                label={componentText.catalogValue}
                schema={valueMode === 'text' ? z.string() : z.json()}
                value={value ?? ''}
                readOnly={false}
                onDraftChange={draftChanged}
                onChange={(input) => {
                  const json = z.json().safeParse(input);
                  if (json.success) applyValue(json.data);
                }}
              />
              <h3>{componentText.keyReferences}</h3>
              {references.length > 0 && <p>{componentText.sharedKeyNotice}</p>}
              <ul>
                {references.map((binding) => (
                  <li key={binding.nodeId + JSON.stringify(binding.targetPath)}>
                    {binding.nodeId} · {formatVariablePath(binding.targetPath)}
                  </li>
                ))}
              </ul>
              {references.length > 0 && <p>{componentText.referencedKey}</p>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
