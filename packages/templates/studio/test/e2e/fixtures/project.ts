import { parseProject } from '@frontend/studio/data';
import { contentRegistry } from '@frontend/puck-adapter/schema';
import { readJsonPath } from '@frontend/ui-document/inspection';
import { createProject } from '@frontend/studio/data';
import type { StudioProject } from '@frontend/studio/data';
export const project: StudioProject = {
  ...createProject('neutral-project'),
  document: {
    documentId: 'neutral-project',
    schemaVersion: 1,
    revision: 1,
    data: { root: {}, content: [{ type: 'Heading', props: { id: 'title', text: '', level: 1 } }] },
    bindings: [{ nodeId: 'title', targetPath: ['text'], sourcePath: ['copy', 'hero', 'title'] }],
  },
  catalogs: { en: { hero: { title: 'Quiet discoveries' } }, zh: { hero: { title: '安静的发现' } } },
  context: { settings: { compact: true } },
};

export function checkedProject(value: unknown): StudioProject {
  const result = parseProject(value, contentRegistry);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}
export const catalogValue = (project: StudioProject, locale: string, path: readonly string[]) =>
  readJsonPath(project.catalogs[locale] ?? {}, path);
