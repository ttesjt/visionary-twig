import { existsSync, lstatSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { URL, fileURLToPath, pathToFileURL } from 'node:url';

export function sourceFile(directory, target) {
  if (!target) return undefined;
  const candidate = path.resolve(directory, target.replace(/^\.\/dist\//, './src/'));
  const stem = candidate.replace(/(?:\.d)?\.(?:[cm]?[jt]s|[jt]sx)$/, '');
  const sources = /(?:\.mjs|\.d\.mts)$/.test(candidate)
    ? [stem + '.mts', stem + '.ts']
    : /(?:\.cjs|\.d\.cts)$/.test(candidate)
      ? [stem + '.cts', stem + '.ts']
      : [stem + '.ts', stem + '.tsx', stem + '.mts', stem + '.cts'];
  return [...sources, candidate].find(
    (file) => existsSync(file) && /(?:\.[cm]?[jt]sx?|\.json)$/.test(file)
  );
}
function importMapping(imports, specifier) {
  if (!imports || specifier === '#' || specifier.endsWith('/')) return undefined;
  if (!specifier.includes('*') && Object.hasOwn(imports, specifier))
    return { value: imports[specifier] };
  const patterns = Object.keys(imports)
    .filter((key) => key.includes('*') && key.indexOf('*') === key.lastIndexOf('*'))
    .sort((a, b) => b.indexOf('*') - a.indexOf('*') || b.length - a.length);
  for (const key of patterns) {
    const [prefix, suffix] = key.split('*');
    if (
      specifier.length >= key.length &&
      specifier.startsWith(prefix) &&
      specifier.endsWith(suffix)
    )
      return {
        value: imports[key],
        match: specifier.slice(prefix.length, specifier.length - suffix.length),
      };
  }
  return undefined;
}

/** Expand the selected package imports entry. Policy checks all declared condition targets. */
export function importTargets(manifest, specifier, { runtime = false } = {}) {
  if (!specifier.startsWith('#')) return [specifier];
  const mapping = importMapping(manifest.imports, specifier);
  if (!mapping) return [];
  function collect(value) {
    if (typeof value === 'string')
      return [mapping.match === undefined ? value : value.replaceAll('*', () => mapping.match)];
    if (!value || typeof value !== 'object') return [];
    return Object.entries(value).flatMap(([condition, target]) =>
      runtime && /^types(?:@|$)/u.test(condition) ? [] : collect(target)
    );
  }
  return [...new Set(collect(mapping.value))];
}

export function contains(directory, file) {
  const relative = path.relative(directory, file);
  return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

/** Resolve a local target and keep its on-disk file separate from any source projection. */
export function localPackageImport(directory, target) {
  if (!target.startsWith('./')) return undefined;
  try {
    const file = fileURLToPath(new URL(target, pathToFileURL(directory + path.sep)));
    const relative = path.relative(directory, file);
    if (
      !relative ||
      !contains(directory, file) ||
      relative.split(path.sep).includes('node_modules')
    )
      return undefined;
    const root = realpathSync(directory);
    let existing = file;
    while (!lstatSync(existing, { throwIfNoEntry: false })) existing = path.dirname(existing);
    if (!contains(root, realpathSync(existing))) return undefined;
    const fromDist = relative.startsWith('dist' + path.sep);
    const direct = statSync(file, { throwIfNoEntry: false })?.isFile() ? file : undefined;
    const projected = () => sourceFile(directory, './' + relative.split(path.sep).join('/'));
    const source = fromDist ? (projected() ?? direct) : (direct ?? projected());
    const physical = source && realpathSync(source);
    if (physical && !contains(root, physical)) return undefined;
    return { source: physical, fileExists: direct !== undefined };
  } catch {
    return undefined;
  }
}
