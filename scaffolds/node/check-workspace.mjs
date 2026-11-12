import path from 'node:path';
import { checkNodeWorkspace } from './lib/node-workspace-policy.mjs';

const root = path.resolve(import.meta.dirname, '..');
const errors = checkNodeWorkspace(root, { checkExports: !process.argv.includes('--source') });
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Workspace package contracts and dependency boundaries are valid.');
}
