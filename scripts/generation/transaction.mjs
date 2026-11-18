import {
  closeSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync,
  chmodSync,
} from 'node:fs';
import path from 'node:path';
import { git, gitPathspec, requireCleanRepository, commitPaths } from './git.mjs';
import { safeTargetPath } from './paths.mjs';

/** A local lock coordinates generators; HEAD/status checks also catch unrelated user edits. */
export function lockTarget(root) {
  const lock = git(root, [
    'rev-parse',
    '--path-format=absolute',
    '--git-path',
    'workspace-template.lock',
  ]).trim();
  let descriptor;
  try {
    descriptor = openSync(lock, 'wx');
  } catch (cause) {
    throw new Error('Another generation is active or its lock needs inspection: ' + lock, {
      cause,
    });
  }
  writeFileSync(descriptor, String(process.pid));
  return () => {
    closeSync(descriptor);
    rmSync(lock);
  };
}
export function rollbackFiles(root, entries, { pruneEmptyParents = true } = {}) {
  const errors = [];
  for (const entry of [...entries].reverse()) {
    try {
      const file = safeTargetPath(root, entry.relative);
      const current = lstatSync(file, { throwIfNoEntry: false });
      if (current && (!current.isFile() || !readFileSync(file).equals(entry.next)))
        throw new Error('Preserving a concurrent edit: ' + entry.relative);
      if (entry.before) {
        writeFileSync(file, entry.before);
        chmodSync(file, entry.beforeMode);
      } else if (current) rmSync(file);
    } catch (error) {
      errors.push(error);
    }
  }
  if (!pruneEmptyParents) return errors;
  for (const entry of entries.filter((item) => !item.before)) {
    let folder = path.dirname(path.join(root, entry.relative));
    while (folder !== root) {
      try {
        rmdirSync(folder);
      } catch {
        break;
      }
      folder = path.dirname(folder);
    }
  }
  return errors;
}
/** Apply only a validated candidate's path set; a failure never resets unrelated work. */
export async function publishCandidate(root, candidate, head, paths, message, finish) {
  if (requireCleanRepository(root) !== head)
    throw new Error('Target HEAD changed while preparing the app.');
  const entries = paths.map((relative) => {
    const file = safeTargetPath(root, relative);
    const proposed = safeTargetPath(candidate, relative);
    if (!lstatSync(proposed, { throwIfNoEntry: false })?.isFile())
      throw new Error('Generation must not delete files or publish symlinks: ' + relative);
    const before = lstatSync(file, { throwIfNoEntry: false });
    if (before && !before.isFile()) throw new Error('Target path already exists: ' + relative);
    return {
      relative,
      next: readFileSync(proposed),
      mode: statSync(proposed).mode,
      before: before ? readFileSync(file) : null,
      beforeMode: before?.mode,
    };
  });
  const applied = [];
  let stagedByTask = false;
  try {
    for (const entry of entries) {
      const file = safeTargetPath(root, entry.relative);
      mkdirSync(path.dirname(file), { recursive: true });
      if (entry.before) {
        if (!readFileSync(file).equals(entry.before))
          throw new Error('Target changed before applying: ' + entry.relative);
        applied.push(entry);
        writeFileSync(file, entry.next);
      } else {
        const descriptor = openSync(file, 'wx');
        try {
          writeFileSync(descriptor, entry.next);
        } finally {
          closeSync(descriptor);
        }
      }
      chmodSync(file, entry.mode);
      if (!entry.before) applied.push(entry);
    }
    await finish();
    if (git(root, ['rev-parse', 'HEAD']).trim() !== head)
      throw new Error('Target HEAD changed before generation commit.');
    const actual = git(root, ['status', '--porcelain=v1', '--untracked-files=all', '-z']);
    const allowed = new Set(paths);
    for (const item of actual.split('\0').filter(Boolean)) {
      if (![' ', '?'].includes(item[0]))
        throw new Error('Target index changed during generation; refusing commit.');
      if (!allowed.has(item.slice(3)))
        throw new Error(
          'Target changed outside generation paths; refusing commit: ' + item.slice(3)
        );
    }
    for (const entry of entries)
      if (!readFileSync(path.join(root, entry.relative)).equals(entry.next))
        throw new Error('Generated file changed before commit: ' + entry.relative);
    stagedByTask = true;
    return commitPaths(root, paths, message);
  } catch (cause) {
    // If a hook/another process has committed, do not rewrite that history.
    if (git(root, ['rev-parse', 'HEAD']).trim() !== head)
      throw new Error('Generation interrupted after HEAD changed; inspect target history.', {
        cause,
      });
    if (stagedByTask) gitPathspec(root, ['reset', '--quiet', 'HEAD'], paths);
    const errors = rollbackFiles(root, applied);
    if (errors.length)
      throw new AggregateError(
        [cause, ...errors],
        'Generation failed; concurrent user changes were preserved.'
      );
    throw cause;
  }
}
