import 'server-only';
import { ResourceError } from '@frontend/resource-runtime';
import { serverImports } from '../../../../../.generated/text/server-imports';
import { isTextNamespace, textDefinition, textLocale } from '../planning/registry';
const imports: Readonly<Record<string, () => Promise<{ default: unknown }>>> = Object.fromEntries(
  Object.entries(serverImports).map(([file, load]) => {
    const [locale, filename] = file.split('/');
    const namespace = filename?.slice(0, -'.json'.length);
    if (!locale || !namespace || !isTextNamespace(namespace))
      throw new ResourceError('definition', file);
    return [textDefinition(namespace, textLocale(locale)).url, load];
  })
);
export async function readGeneratedText(url: string): Promise<unknown> {
  const load = Object.hasOwn(imports, url) ? imports[url] : undefined;
  if (!load) throw new ResourceError('definition', url);
  return (await load()).default;
}
