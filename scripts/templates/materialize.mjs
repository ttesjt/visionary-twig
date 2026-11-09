import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { copySource, inside, rewritePackageNames, targetFiles } from './files.mjs';

/** Only new package/app directories enter here; reused packages are not rewritten. */
export async function materializePackages(
  destination,
  plan,
  { packages = plan.packages, templates = plan.templates } = {}
) {
  const names = Object.entries(plan.mapping.packages);
  for (const entry of [...packages, ...templates]) {
    const target = inside(destination, entry.destination);
    copySource(entry.source, target, [
      'template.config.mjs',
      'template',
      'README.md',
      ...Object.keys(entry.config?.files ?? {}),
    ]);
    const readme =
      entry.config?.files?.['README.md'] ??
      (existsSync(path.join(entry.source, 'README.md')) ? 'README.md' : undefined);
    if (readme) copySource(inside(entry.source, readme), path.join(target, 'README.md'));
    for (const [name, source] of Object.entries(entry.config?.files ?? {}))
      if (name !== 'README.md') copySource(inside(entry.source, source), inside(target, name));
    rewritePackageNames(target, names);
  }
  const contributions = [];
  for (const entry of templates) {
    contributions.push(entry.config.root ?? {});
    if (!entry.config.initialize) continue;
    const { initialize } = await import(
      pathToFileURL(inside(entry.source, entry.config.initialize)).href
    );
    if (typeof initialize !== 'function')
      throw new Error('Initializer must export initialize(context).');
    const targetDirectory = inside(destination, entry.destination);
    contributions.push(
      (await initialize(
        Object.freeze({
          id: entry.id,
          appId: entry.appId,
          config: entry.config,
          sourceDirectory: entry.source,
          targetDirectory,
          projectName: plan.name,
          scope: plan.scope,
          mapping: plan.mapping,
          files: targetFiles(targetDirectory, destination),
        })
      )) ?? {}
    );
    rewritePackageNames(targetDirectory, names);
  }
  return contributions;
}
