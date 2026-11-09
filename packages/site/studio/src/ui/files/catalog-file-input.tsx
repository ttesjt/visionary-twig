import { useEffect, useRef } from 'react';
import { parseProject } from '../../data/index.js';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import type { ProjectSession } from '../session/use-project-session.js';
import { useStudioTextCatalog } from '../text/context.js';
import { readLocalJson } from './local-files.js';

export function CatalogFileInput({ session }: { readonly session: ProjectSession }) {
  const componentText = useStudioTextCatalog();
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current += 1;
    },
    []
  );
  async function importCatalog(file: File) {
    const initial = session.latest.current;
    if (!initial.flags.canSave) return;
    const { generation, locale } = initial.state;
    const baseline = JSON.stringify(initial.project.catalogs[locale]);
    const id = ++request.current;
    const result = await readLocalJson(file);
    const current = session.latest.current;
    if (id !== request.current || generation !== current.state.generation) return;
    if (!result.ok) {
      session.setIssues(result.errors);
      return;
    }
    if (!current.flags.canSave || baseline !== JSON.stringify(current.project.catalogs[locale])) {
      session.setIssues([
        {
          code: 'catalog-import-conflict',
          path: ['catalogs', locale],
          message:
            'The catalog changed while the file was being read. Current edits were preserved; choose the file again to retry.',
        },
      ]);
      return;
    }
    try {
      const value: unknown = JSON.parse(result.value);
      session.run(
        parseProject(
          {
            ...current.project,
            catalogs: { ...current.project.catalogs, [locale]: value },
          },
          contentRegistry
        )
      );
    } catch {
      session.setIssues([
        {
          code: 'invalid-json',
          path: ['catalogs', locale],
          message: 'Enter a valid catalog JSON object.',
        },
      ]);
    }
  }
  return (
    <label>
      {componentText.catalogFile}
      <input
        type="file"
        accept="application/json,.json"
        aria-label={componentText.catalogFile}
        disabled={!session.flags.canSave}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void importCatalog(file);
        }}
      />
    </label>
  );
}
