import 'server-only';
import { serverImports as configImports } from '../../../../.generated/config/server-imports';
import { serverImports as contentImports } from '../../../../.generated/content/server-imports';
import { jsonDefinition } from './registry';
const imports: Readonly<Record<string, () => Promise<{ default: unknown }>>> = Object.fromEntries(
  (
    [
      ['config', configImports],
      ['content', contentImports],
    ] as const
  ).flatMap(([kind, files]) =>
    Object.entries(files).map(([file, load]) => [
      jsonDefinition(kind, file.slice(0, -'.json'.length)).url,
      load,
    ])
  )
);
export async function readGeneratedJsonURL(url: string): Promise<unknown> {
  const load = Object.hasOwn(imports, url) ? imports[url] : undefined;
  if (!load) throw new Error('Unregistered JSON resource URL.');
  return (await load()).default;
}
