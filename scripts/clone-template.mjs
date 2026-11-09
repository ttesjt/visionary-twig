import path from 'node:path';
import { readTemplateCatalog } from './templates/catalog.mjs';
import { cloneOptions } from './templates/options.mjs';
import { cloneProject } from './templates/run.mjs';

const root = path.resolve(import.meta.dirname, '..');
try {
  const options = cloneOptions(process.argv.slice(2));
  if (options.help)
    console.log(
      'pnpm template:clone --output <new-directory> [--name @scope/project] [--templates <id[,id...]>] [--app studio=editor] [--offline] [--no-install | --no-verify] [--browser]\nDefault: install once and run validate. --browser also runs Chromium and fixed-theme checks.'
    );
  else if (options.list)
    for (const entry of await readTemplateCatalog(root))
      console.log(entry.id + ': ' + entry.destination);
  else process.exitCode = await cloneProject(root, options);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
