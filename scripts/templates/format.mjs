import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { isTextSource } from './files.mjs';
import { format, resolveConfig } from 'prettier';

/** Format generated text with the project's own copied configuration. */
export async function formatProject(root) {
  const options = await resolveConfig(path.join(root, 'package.json'));
  async function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (isTextSource(entry.name))
        writeFileSync(
          file,
          await format(readFileSync(file, 'utf8'), { ...options, filepath: file })
        );
    }
  }
  await visit(root);
}
