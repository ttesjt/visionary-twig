import path from 'node:path';
import { generationOptions } from './generation/options.mjs';
import { cloneRepository } from './generation/create.mjs';
import { readTemplateCatalog } from './templates/catalog.mjs';

const root = path.resolve(import.meta.dirname, '..');
try {
  const options = generationOptions(process.argv.slice(2), 'repository');
  if (options.help)
    console.log(
      'pnpm repo:clone --output <new-directory> [--bare | --template <id> --app-name <name>] [--name @scope/project] [--offline] [--no-verify] [--browser]\nDefault: independent monorepo plus plain-next in apps/web. Each template has its own commit.'
    );
  else if (options.list) {
    for (const entry of await readTemplateCatalog(root))
      if (entry.type === 'app') console.log(entry.id);
  } else {
    const result = await cloneRepository(root, options.destination, options);
    console.log(
      'Created:',
      options.destination,
      '\nBaseline:',
      result.baseCommit,
      result.commit ? '\nApp: ' + result.commit : ''
    );
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
