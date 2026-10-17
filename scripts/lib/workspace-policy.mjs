import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import ts from 'typescript';

const builtins = new Set(builtinModules.flatMap((name) => [name, 'node:' + name]));
const ignored = new Set(['node_modules', 'dist', '.next', 'coverage']);
const formatScripts = ['format', 'format:check'];
const codeScripts = [
  'build',
  'clean',
  'dev',
  'typecheck',
  'lint',
  'lint:fix',
  'test',
  'test:watch',
  'test:coverage',
  ...formatScripts,
];
const libraryFiles = [
  'README.md',
  'src/index.ts',
  'tsconfig.json',
  'tsconfig.build.json',
  'vitest.config.ts',
];
const policies = {
  'node-library': { location: 'packages', scripts: codeScripts, files: libraryFiles },
  'react-library': { location: 'packages', scripts: codeScripts, files: libraryFiles },
  'next-app': {
    location: 'apps',
    scripts: [...codeScripts, 'start'],
    files: ['README.md', 'tsconfig.json', 'vitest.config.ts'],
  },
  styles: { location: 'packages', scripts: formatScripts, files: ['README.md'] },
};

function walk(directory, includeBuildOutput = false) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name) && !(includeBuildOutput && entry.name === 'dist')) return [];
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target, includeBuildOutput) : [target];
  });
}
function exportTargets(value) {
  return typeof value === 'string' ? [value] : Object.values(value ?? {}).flatMap(exportTargets);
}
function outside(directory, target) {
  const relative = path.relative(directory, target);
  return relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative);
}
function matches(pattern, value) {
  if (!pattern.includes('*')) return pattern === value;
  const [prefix, suffix] = pattern.split('*');
  return (
    value.startsWith(prefix) &&
    value.endsWith(suffix) &&
    value.length >= prefix.length + suffix.length
  );
}
function exported(exports, subpath) {
  if (!exports) return false;
  if (typeof exports === 'string' || Array.isArray(exports)) return subpath === '.';
  const keys = Object.keys(exports);
  if (Object.hasOwn(exports, subpath)) return exportTargets(exports[subpath]).length > 0;
  return keys.some((key) => key.startsWith('.'))
    ? keys.some((key) => matches(key, subpath) && exportTargets(exports[key]).length > 0)
    : subpath === '.';
}

export function checkWorkspace(root, { checkExports = true } = {}) {
  const errors = [];
  const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
  const rootManifest = readJson(path.join(root, 'package.json'));
  const scope = rootManifest.name?.match(/^(@[^/]+)\//)?.[1];
  if (!scope) errors.push('Root package name must be scoped; its scope defines workspace naming.');
  const workspaces = ['apps', 'packages'].flatMap((location) => {
    const parent = path.join(root, location);
    if (!existsSync(parent)) return [];
    return readdirSync(parent).flatMap((name) => {
      const directory = path.join(parent, name);
      const file = path.join(directory, 'package.json');
      return existsSync(file) ? [{ directory, location, manifest: readJson(file) }] : [];
    });
  });
  const byName = new Map();
  for (const workspace of workspaces) {
    const name = workspace.manifest.name;
    if (byName.has(name)) errors.push('Duplicate workspace name: ' + name);
    byName.set(name, workspace);
  }
  for (const { directory, location, manifest } of workspaces) {
    const label = manifest.name ?? path.relative(root, directory);
    const policy = policies[manifest.workspaceKind];
    if (!policy) {
      errors.push(
        label + ': declare a supported workspaceKind (' + Object.keys(policies).join(', ') + ').'
      );
      continue;
    }
    if (policy.location !== location)
      errors.push(label + ': this workspaceKind belongs in ' + policy.location + '/.');
    if (
      manifest.private !== true ||
      manifest.type !== 'module' ||
      !manifest.name?.startsWith(scope + '/')
    ) {
      errors.push(label + ': workspaces must be private ESM packages in the root scope.');
    }
    for (const script of policy.scripts) {
      if (typeof manifest.scripts?.[script] !== 'string' || !manifest.scripts[script].trim()) {
        errors.push(
          label + ': missing required script "' + script + '" for ' + manifest.workspaceKind + '.'
        );
      }
    }
    for (const file of policy.files) {
      if (!existsSync(path.join(directory, file)))
        errors.push(label + ': missing required file ' + file);
    }
    if (location === 'packages' && !manifest.exports)
      errors.push(label + ': declare public exports.');
    if (
      manifest.workspaceKind === 'styles' &&
      (!Array.isArray(manifest.sideEffects) || !manifest.sideEffects.includes('**/*.css'))
    ) {
      errors.push(label + ': CSS packages must preserve CSS side effects.');
    }
    if (manifest.workspaceKind === 'react-library' && !manifest.peerDependencies?.react) {
      errors.push(label + ': React libraries must declare a React peer dependency.');
    }
    const runtime = {
      ...manifest.dependencies,
      ...manifest.peerDependencies,
      ...manifest.optionalDependencies,
    };
    const declared = { ...runtime, ...manifest.devDependencies };
    for (const group of [
      'dependencies',
      'peerDependencies',
      'devDependencies',
      'optionalDependencies',
    ]) {
      for (const [dependency, range] of Object.entries(manifest[group] ?? {})) {
        if (byName.has(dependency) && range !== 'workspace:*')
          errors.push(label + ': internal dependency ' + dependency + ' must use workspace:*.');
        if (location === 'packages' && byName.get(dependency)?.location === 'apps')
          errors.push(label + ': packages cannot depend on application hosts.');
      }
    }
    if (checkExports) {
      for (const target of exportTargets(manifest.exports)) {
        const resolved = path.resolve(directory, target);
        if (!target.startsWith('./') || outside(directory, resolved)) {
          errors.push(label + ': exports must target files inside the package: ' + target);
        } else if (target.includes('*')) {
          if (!walk(directory, true).some((file) => matches(resolved, file)))
            errors.push(label + ': missing public export ' + target);
        } else if (!existsSync(resolved))
          errors.push(label + ': missing public export ' + target + '; build packages first.');
      }
    }
    for (const file of walk(directory)) {
      const relative = path.relative(directory, file);
      const report = (message) => errors.push(path.relative(root, file) + ': ' + message);
      const source = relative.startsWith('src' + path.sep);
      const test = /[.](test|spec)[.]/.test(file) || relative.startsWith('test' + path.sep);
      const code = /\.[cm]?[jt]sx?$/.test(file);
      const css = /\.(css|scss|sass|less)$/.test(file);
      if (css && manifest.workspaceKind !== 'styles') report('CSS belongs in a styles workspace.');
      if ((!code && !css) || file.endsWith('next-env.d.ts')) continue;
      const text = readFileSync(file, 'utf8');
      const specifiers = code
        ? ts.preProcessFile(text, true, true).importedFiles.map(({ fileName }) => fileName)
        : [...text.matchAll(/@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/g)].map((match) => match[1]);
      for (const specifier of specifiers) {
        if (specifier.startsWith('.')) {
          if ((source || test) && outside(directory, path.resolve(path.dirname(file), specifier)))
            report('source import crosses a package boundary: ' + specifier);
          if (
            source &&
            !test &&
            manifest.workspaceKind === 'node-library' &&
            !/\.(?:[cm]?js|json|node)$/.test(specifier)
          )
            report('Node library imports need explicit runtime extensions: ' + specifier);
          continue;
        }
        if (specifier.startsWith('@/') && location === 'apps') continue;
        if (builtins.has(specifier)) {
          if (source && !test && manifest.workspaceKind === 'react-library')
            report('browser UI cannot import Node builtins.');
          continue;
        }
        const dependency = specifier.startsWith('@')
          ? specifier.split('/').slice(0, 2).join('/')
          : specifier.split('/')[0];
        const imported = byName.get(dependency);
        if (location === 'packages' && dependency === 'next')
          report('framework integration belongs in apps/.');
        if (location === 'packages' && imported?.location === 'apps')
          report('packages cannot depend on application hosts.');
        if (
          location === 'packages' &&
          code &&
          (imported?.manifest.workspaceKind === 'styles' ||
            /\.(css|scss|sass|less)$/.test(specifier))
        )
          report('application entries select stylesheets.');
        const allowed = source && !test ? runtime : declared;
        if (dependency !== manifest.name && !allowed[dependency])
          report('undeclared ' + (source && !test ? 'runtime ' : '') + 'dependency ' + dependency);
        if (imported) {
          const subpath =
            specifier === dependency ? '.' : './' + specifier.slice(dependency.length + 1);
          if (!exported(imported.manifest.exports, subpath))
            report('import uses a non-public export: ' + specifier);
        }
      }
    }
  }
  return errors;
}
