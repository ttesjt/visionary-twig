import path from 'node:path';
import { cloneOptions } from './templates/options.mjs';
import { cloneProject } from './templates/run.mjs';

const root = path.resolve(import.meta.dirname, '..');
try {
  const options = cloneOptions(process.argv.slice(2));
  if (options.help)
    console.log(
      'pnpm library:clone --output <new-directory> [--name @scope/project] [--offline] [--no-install | --no-verify]\nCreates an independent workspace from node-library; it is not an app template.'
    );
  else {
    if (
      options.templates ||
      Object.keys(options.appNames).length ||
      options.browser ||
      options.list
    )
      throw new Error('library:clone accepts one Node library; use --output and optional --name.');
    process.exitCode = await cloneProject(root, { ...options, templates: ['node-library'] });
  }
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
