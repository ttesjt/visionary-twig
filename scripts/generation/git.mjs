import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';

export function git(root, args, options = {}) {
  return execFileSync('git', ['--literal-pathspecs', '-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}
export function requireCleanRepository(root) {
  if (realpathSync(git(root, ['rev-parse', '--show-toplevel']).trim()) !== realpathSync(root))
    throw new Error('Target must be the Git repository root.');
  if (git(root, ['status', '--porcelain=v1', '--untracked-files=all']).trim())
    throw new Error(
      'Target working tree must be clean; commit existing changes before adding an app.'
    );
  git(root, ['var', 'GIT_AUTHOR_IDENT']);
  git(root, ['var', 'GIT_COMMITTER_IDENT']);
  return git(root, ['rev-parse', 'HEAD']).trim();
}
export function sourceIdentity(root) {
  return {
    revision: git(root, ['rev-parse', 'HEAD']).trim(),
    dirty: !!git(root, ['status', '--porcelain=v1']).trim(),
  };
}
export function commitPaths(root, paths, message) {
  if (!paths.length) throw new Error('No generated changes to commit.');
  // Literal pathspecs and an explicit list prevent user files entering this task's commit.
  gitPathspec(root, ['add'], paths);
  git(root, ['commit', '-m', message]);
  return git(root, ['rev-parse', 'HEAD']).trim();
}
export function changedPaths(root) {
  return [
    ...new Set(
      [
        ...git(root, ['diff', '--name-only', '-z', 'HEAD']).split('\0'),
        ...git(root, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0'),
      ].filter(Boolean)
    ),
  ];
}

export function gitPathspec(root, args, paths) {
  return git(root, [...args, '--pathspec-from-file=-', '--pathspec-file-nul'], {
    input: paths.join('\0') + '\0',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}
