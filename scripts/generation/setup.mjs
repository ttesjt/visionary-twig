import { lstatSync, readdirSync, readFileSync, rmdirSync } from 'node:fs';
import path from 'node:path';
import { safeTargetPath } from './paths.mjs';
import { rollbackFiles } from './transaction.mjs';

/** Only the selected new app's declared outputs are owned by this initialization. */
export async function setupTemplate(root, entry, options, run) {
  if (!entry.setup) return () => {};
  const outputs = entry.setup.outputs.map((relative) => entry.destination + '/' + relative);
  for (const relative of outputs)
    if (lstatSync(safeTargetPath(root, relative), { throwIfNoEntry: false }))
      throw new Error('Setup output already exists: ' + relative);

  const files = [];
  const directories = new Set();
  for (const output of outputs) {
    let parent = path.posix.dirname(output);
    while (
      parent !== entry.destination &&
      !lstatSync(safeTargetPath(root, parent), { throwIfNoEntry: false })
    ) {
      directories.add(parent);
      parent = path.posix.dirname(parent);
    }
  }
  function snapshot(relative) {
    const filename = safeTargetPath(root, relative);
    const stat = lstatSync(filename, { throwIfNoEntry: false });
    if (!stat) return;
    if (stat.isDirectory()) {
      directories.add(relative);
      for (const name of readdirSync(filename)) snapshot(relative + '/' + name);
    } else if (stat.isFile()) {
      files.push({ relative, next: readFileSync(filename), before: null });
    } else throw new Error('Setup produced an unsupported output: ' + relative);
  }
  function rollback() {
    const errors = rollbackFiles(root, files, { pruneEmptyParents: false });
    // Remove only directories created by setup, deepest first, including empty media.
    const deepestFirst = [...directories].sort((a, b) => b.split('/').length - a.split('/').length);
    for (const relative of deepestFirst) {
      try {
        rmdirSync(safeTargetPath(root, relative));
      } catch (error) {
        // A later user file keeps its containing directory; already removed paths are harmless.
        if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) errors.push(error);
      }
    }
    if (errors.length) throw new AggregateError(errors, 'Unable to remove setup outputs.');
  }
  try {
    await run(root, ['--dir', entry.destination, ...entry.setup.command], options);
  } catch (cause) {
    for (const relative of outputs) snapshot(relative);
    try {
      rollback();
    } catch (error) {
      throw new AggregateError([cause, error], 'Setup failed; inspect its local outputs.');
    }
    throw cause;
  }
  for (const relative of outputs) snapshot(relative);
  return rollback;
}
