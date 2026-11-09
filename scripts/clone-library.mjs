import path from 'node:path';
import { generationOptions } from './generation/options.mjs';
import { cloneRepository } from './generation/create.mjs';
import { readTemplateCatalog } from './templates/catalog.mjs';

const root = path.resolve(import.meta.dirname, '..');
try {
  const options = generationOptions(process.argv.slice(2), 'library');
  if (options.help)
    console.log(
      'pnpm library:clone --output <new-directory> [--name @scope/project] [--template node-library] [--offline] [--no-verify]\nCreates the same independent framework baseline, then one separate library-template commit.'
    );
  else if (options.list) {
    for (const entry of await readTemplateCatalog(root))
      if (entry.type === 'library') console.log(entry.id);
  } else {
    const result = await cloneRepository(root, options.destination, options);
    console.log(
      'Created library workspace:',
      options.destination,
      '\nBaseline:',
      result.baseCommit,
      '\nLibrary:',
      result.commit
    );
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
