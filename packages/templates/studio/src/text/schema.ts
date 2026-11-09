import { z } from 'zod';
import { studioJsonTextCatalogSchema } from '@frontend/studio/json-editor/text-catalog';
import { studioTextCatalogSchema } from '@frontend/studio/text-catalog';
import { workspaceTextCatalogSchema } from '../workspace/text.schema.ts';
const text = z.string().min(1);
export const studioAppTextCatalogSchema = z.strictObject({
  metadata: z.strictObject({ title: text, description: text, imageAlt: text }),
  host: z.strictObject({
    example: text,
    previewUnavailable: text,
    previewExpired: text,
    previewIssues: text,
  }),
  workbench: studioTextCatalogSchema,
  jsonEditor: studioJsonTextCatalogSchema,
  workspace: workspaceTextCatalogSchema,
});

export type AppTextCatalog = z.infer<typeof studioAppTextCatalogSchema>;

interface TextTree {
  [key: string]: string | TextTree;
}

/** Map the flat main dictionary to the editor component contracts at preparation and render time. */
export function studioLabels(entries: Iterable<readonly [string, string]>): AppTextCatalog {
  const tree = Object.create(null) as TextTree;
  for (const [path, value] of entries) {
    const parts = path.split('.');
    if (!Object.hasOwn(studioAppTextCatalogSchema.shape, parts[0] ?? '')) continue;
    const key = parts.pop();
    if (!key) throw new Error('Empty Studio text key.');
    let branch = tree;
    for (const segment of parts) {
      const child = (branch[segment] ??= Object.create(null) as TextTree);
      if (typeof child === 'string') throw new Error('Conflicting Studio text key: ' + path);
      branch = child;
    }
    branch[key] = value;
  }
  return studioAppTextCatalogSchema.parse(tree);
}
