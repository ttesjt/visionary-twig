import { lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { inside } from '../templates/files.mjs';

/** Reject symlink ancestors, including broken links, before reading or writing target inputs. */
export function safeTargetPath(root, relative) {
  const target = inside(root, relative);
  let cursor = root;
  for (const part of path.relative(root, target).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    const stat = lstatSync(cursor, { throwIfNoEntry: false });
    if (stat?.isSymbolicLink()) throw new Error('Target symlinks are unsupported: ' + relative);
    if (cursor !== target && stat && !stat.isDirectory())
      throw new Error('Target parent is not a directory: ' + relative);
  }
  return target;
}
export function canonicalFuturePath(target) {
  let cursor = path.resolve(target);
  const suffix = [];
  while (!lstatSync(cursor, { throwIfNoEntry: false })) {
    suffix.unshift(path.basename(cursor));
    cursor = path.dirname(cursor);
  }
  return path.join(realpathSync(cursor), ...suffix);
}
export function assertExternalTarget(source, target) {
  const relative = path.relative(realpathSync(source), canonicalFuturePath(target));
  if (
    relative === '' ||
    (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))
  )
    throw new Error('Destination must be outside the source repository.');
}
