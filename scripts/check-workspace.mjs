import { URL, fileURLToPath } from 'node:url';
import { checkWorkspace } from './lib/workspace-policy.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const errors = checkWorkspace(root, { checkExports: !process.argv.includes('--source') });
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Workspace kinds, scripts, boundaries, dependencies, and style ownership are valid.');
}
