import path from 'node:path';
import { generationOptions } from './generation/options.mjs';
import { appendTemplate } from './generation/append.mjs';
import { readTemplateCatalog } from './templates/catalog.mjs';

const root = path.resolve(import.meta.dirname, '..');
try {
  const options = generationOptions(process.argv.slice(2), 'template');
  if (options.help)
    console.log(
      'pnpm template:clone --target <existing-monorepo> --name <app-name> [--template <id>] [--offline] [--no-verify] [--browser]\nDefault template: plain-next. Existing source is never overwritten; one commit includes the app and its required additions.'
    );
  else if (options.list) {
    for (const entry of await readTemplateCatalog(root))
      if (entry.type === 'app') console.log(entry.id);
  } else {
    const result = await appendTemplate(root, options.destination, options);
    console.log('Added:', result.plan.templates[0].destination, '\nCommit:', result.commit);
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
