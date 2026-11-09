import { readdirSync, readFileSync, writeFileSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { isTextSource } from './files.mjs';
import { format, resolveConfig } from 'prettier';

const OUTPUTS = new Set([
  '.git',
  'node_modules',
  'dist',
  '.next',
  '.generated',
  '.local',
  '.cache',
  'coverage',
  'test-results',
  'playwright-report',
]);
/** Format only caller-owned paths using the target's own configuration. */
export async function formatProject(root, targets = ['.']) {
  const options = await resolveConfig(path.join(root, 'package.json'));
  async function visit(file) {
    const stat = lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error('Cannot format a target symlink: ' + file);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(file, { withFileTypes: true }))
        if (!OUTPUTS.has(entry.name)) await visit(path.join(file, entry.name));
    } else if (isTextSource(file))
      writeFileSync(file, await format(readFileSync(file, 'utf8'), { ...options, filepath: file }));
  }
  for (const target of targets) await visit(path.join(root, target));
}
