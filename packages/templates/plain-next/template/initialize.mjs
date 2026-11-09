import { initializeNextApp } from '../../../../scripts/templates/initializers/next.mjs';

// This template owns its Next host configuration; shared file operations stay in the generator.
export function initialize(context) {
  context.files.editText('README.md', (text) => text.replaceAll('{{appId}}', context.appId));
  return initializeNextApp(context);
}
