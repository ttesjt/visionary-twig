import { cpSync, lstatSync, realpathSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const isTextSource = (name) => /\.(?:json|[cm]?[jt]sx?|md|ya?ml|css)$/u.test(name);

const GENERATED = new Set([
  '.git',
  'node_modules',
  'dist',
  '.next',
  '.open-next',
  '.wrangler',
  '.DS_Store',
  'coverage',
  '.cache',
  '.local',
  '.generated',
  'test-results',
  'playwright-report',
  'next-env.d.ts',
]);
export const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
export function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
export function inside(directory, relative) {
  if (
    typeof relative !== 'string' ||
    path.isAbsolute(relative) ||
    relative.split(/[\\/]/u).includes('..')
  )
    throw new Error('Expected a bounded relative path: ' + relative);
  return path.join(directory, relative);
}
function ignoredSourcePaths(source) {
  const parent = lstatSync(source).isDirectory() ? source : path.dirname(source);
  const gitRoot = spawnSync('git', ['-C', parent, 'rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  });
  if (gitRoot.status !== 0) return [];
  const root = gitRoot.stdout.trim();
  const canonicalSource = realpathSync(source);
  const ignored = spawnSync(
    'git',
    [
      '--literal-pathspecs',
      '-C',
      root,
      'ls-files',
      '--others',
      '--ignored',
      '--exclude-standard',
      '--directory',
      '-z',
      '--',
      path.relative(root, canonicalSource) || '.',
    ],
    { encoding: 'utf8' }
  );
  if (ignored.status !== 0) throw new Error('Cannot inspect ignored source paths: ' + source);
  return ignored.stdout
    .split('\0')
    .filter(Boolean)
    .map((file) => path.resolve(source, path.relative(canonicalSource, path.resolve(root, file))));
}
export function copySource(source, destination, excluded = []) {
  const ignored = ignoredSourcePaths(source);
  cpSync(source, destination, {
    recursive: true,
    force: false,
    errorOnExist: true,
    filter(file) {
      const name = path.basename(file);
      const relative = path.relative(source, file).split(path.sep).join('/');
      if (
        ignored.some((entry) => file === entry || file.startsWith(entry + path.sep)) ||
        GENERATED.has(name) ||
        name.endsWith('.tsbuildinfo') ||
        name.endsWith('.log') ||
        (name.startsWith('.env') && name !== '.env.example') ||
        excluded.some((entry) => relative === entry || relative.startsWith(entry + '/'))
      )
        return false;
      if (lstatSync(file).isSymbolicLink())
        throw new Error('Source symlinks are unsupported: ' + file);
      return true;
    },
  });
}
export function targetFiles(directory, projectRoot) {
  return Object.freeze({
    editJson(relative, update) {
      const file = inside(directory, relative);
      writeJson(file, update(readJson(file)));
    },
    editText(relative, update) {
      const file = inside(directory, relative);
      writeFileSync(file, update(readFileSync(file, 'utf8')));
    },
    write(relative, value) {
      writeFileSync(inside(directory, relative), value);
    },
    rootReference(relative) {
      const reference = path
        .relative(directory, inside(projectRoot, relative))
        .split(path.sep)
        .join('/');
      return reference.startsWith('.') ? reference : './' + reference;
    },
  });
}
export function replacePackageNames(source, names) {
  if (!names.length) return source;
  const replacements = new Map(names);
  const alternatives = [...replacements.keys()]
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp('(?:' + alternatives.join('|') + ')(?=$|[^a-zA-Z0-9_-])', 'gu');
  return source.replace(pattern, (name) => replacements.get(name));
}
export function rewritePackageNames(directory, names) {
  if (!names.length) return;
  function visit(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (isTextSource(entry.name))
        writeFileSync(file, replacePackageNames(readFileSync(file, 'utf8'), names));
    }
  }
  visit(directory);
}
export function assertNewDestination(destination) {
  if (lstatSync(destination, { throwIfNoEntry: false }))
    throw new Error('Destination already exists: ' + destination);
}
