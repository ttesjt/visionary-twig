/** Source preview inputs. Clone recipes replace this declaration with app-owned paths. */
import type { ProjectFilePageDefinition } from '../../src/features/projects/files/index.ts';
export const PROJECT_FILE_INPUT_DIRECTORY = 'template/demo/content/default/data/project-files';
export const PROJECT_PUBLIC_DIRECTORY = 'template/demo/public';
export const PROJECT_TEXT_NAMESPACES = ['projects-demo'] as const;
export const PROJECT_TEXT_DEFAULT_DIRECTORIES = {
  'projects-demo': 'template/demo/content/default/text',
  'field-notes': 'template/demo/content/default/text',
};
export const PROJECT_FILE_PAGES = [
  {
    slug: 'field-notes',
    namespace: 'project-field-notes',
    filename: 'field-notes.json',
    textNamespaces: ['field-notes'],
  },
] as const satisfies readonly ProjectFilePageDefinition[];

export const PROJECT_DEMO_ENABLED = true;
