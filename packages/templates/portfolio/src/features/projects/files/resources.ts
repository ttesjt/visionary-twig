import { defineScope } from '../../../infra/define-scope.ts';
import { PROJECT_FILE_INDEX, PROJECT_FILE_PAGES, type ProjectFileNamespace } from './constants.ts';
import { projectFileCatalogSchema, projectFilePageSchema } from './schemas.ts';

import { PROJECT_FILE_INPUT_DIRECTORY } from '../../../site/project-data.ts';

const input = (file: string) => ({
  defaults: PROJECT_FILE_INPUT_DIRECTORY + '/' + file,
  custom: '.local/content/data/project-files/' + file,
});

type FileScope<N extends string, T extends string> = Readonly<{
  id: N;
  text: readonly T[];
  config: readonly [];
  content: readonly [N];
}>;

// Preserve the declared namespace keys, including an empty registry in a clean clone.
function pageScopes<N extends string, T extends string = never>(
  pages: readonly { readonly namespace: N; readonly textNamespaces?: readonly T[] }[]
) {
  return Object.fromEntries(
    pages.map(({ namespace, textNamespaces = [] }) => [
      namespace,
      defineScope({ id: namespace, text: textNamespaces, config: [], content: [namespace] }),
    ])
  ) as { readonly [K in N]: FileScope<K, T> };
}
export const PROJECT_FILE_SCOPES = pageScopes(PROJECT_FILE_PAGES);

export function projectFileScope(
  namespace: ProjectFileNamespace
): (typeof PROJECT_FILE_SCOPES)[ProjectFileNamespace] {
  const scope = PROJECT_FILE_SCOPES[namespace];
  if (!scope) throw new Error('Unregistered project file scope: ' + namespace);
  return scope;
}

// All page namespaces use the same document envelope schema.
const pageSchemas = Object.fromEntries(
  PROJECT_FILE_PAGES.map((page) => [page.namespace, projectFilePageSchema])
) as Readonly<Record<ProjectFileNamespace, typeof projectFilePageSchema>>;

export const projectFileSchemas: {
  readonly projects: typeof projectFileCatalogSchema;
} & Readonly<Record<ProjectFileNamespace, typeof projectFilePageSchema>> = {
  [PROJECT_FILE_INDEX]: projectFileCatalogSchema,
  ...pageSchemas,
};
export const PROJECT_FILE_RESOURCES = Object.fromEntries([
  [PROJECT_FILE_INDEX, input('projects.json')],
  ...PROJECT_FILE_PAGES.map((page) => [page.namespace, input(page.filename)]),
]) as Readonly<Record<typeof PROJECT_FILE_INDEX | ProjectFileNamespace, ReturnType<typeof input>>>;

export const PROJECT_FILE_LAYOUT_NAMESPACES = [PROJECT_FILE_INDEX] as const;
