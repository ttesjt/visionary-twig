import path from 'node:path';
import { readTemplateCatalog } from './templates/catalog.mjs';
import { checkTemplateFoundations } from './templates/foundation.mjs';

try {
  const errors = checkTemplateFoundations(
    await readTemplateCatalog(path.resolve(import.meta.dirname, '..'))
  );
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else
    console.log(
      'Maintained Next templates share identical infra, common site entries and isolated optional previews.'
    );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
