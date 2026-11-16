/** Source preview inputs. Clone recipes replace this declaration with app-owned paths. */
export const PROJECT_FILE_INPUT_DIRECTORY = 'template/demo/content/default/data/project-files';
export const PROJECT_PUBLIC_DIRECTORY = 'template/demo/public';
export const PROJECT_TEXT_NAMESPACES = ['projects-demo'] as const;
export const PROJECT_TEXT_DEFAULT_DIRECTORIES = {
  'projects-demo': 'template/demo/content/default/text',
};
export const PROJECT_FILE_PAGES = [
  { slug: 'field-notes', namespace: 'project-field-notes', filename: 'field-notes.json' },
] as const;

export const PROJECT_DEMO_ENABLED = true;
