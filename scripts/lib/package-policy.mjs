import { checkFeatureBoundaries } from './feature-boundaries/check.mjs';
import { checkEntryBoundaries } from './entry-boundaries.mjs';
import { DEPENDENCY_GROUPS, discoverWorkspaces } from './workspace-discovery.mjs';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { URL } from 'node:url';
import { contains, importTargets, localPackageImport } from './module-targets.mjs';
import path from 'node:path';
import ts from 'typescript';

const ignored = new Set([
  'node_modules',
  'dist',
  '.next',
  '.open-next',
  'coverage',
  '.local',
  '.generated',
  '.wrangler',
]);
export const formatScripts = ['format', 'format:check'];
export const codeScripts = [
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
export const libraryPolicy = {
  location: 'packages',
  scripts: codeScripts,
  files: libraryFiles,
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

function dependencySpecifiers(workspace, specifiers, report, checkExports) {
  return specifiers.flatMap((original) => {
    if (!original.startsWith('#')) return [{ specifier: original, report }];
    const targets = importTargets(workspace.manifest, original);
    if (!targets.length) report('package import is not defined: ' + original);
    const runtimeTargets = checkExports
      ? new Set(importTargets(workspace.manifest, original, { runtime: true }))
      : undefined;
    return targets.flatMap((specifier) => {
      const viaAlias = (message) => report(message + ' (via ' + original + ')');
      if (specifier.startsWith('./')) {
        const target = localPackageImport(workspace.directory, specifier);
        if (!target) viaAlias('package import target must stay inside the package: ' + specifier);
        else if (runtimeTargets?.has(specifier) && !target.fileExists)
          viaAlias(
            'missing package import runtime file: ' +
              specifier +
              '; build packages first or correct the target'
          );
        return [];
      }
      if (
        !specifier ||
        /^[.#/]/u.test(specifier) ||
        specifier.startsWith('@/') ||
        URL.canParse(specifier)
      ) {
        viaAlias('invalid package import target: ' + specifier);
        return [];
      }
      return [{ specifier, report: viaAlias }];
    });
  });
}

export function checkPackageWorkspace(root, { groups, policies, rules = {}, checkExports = true }) {
  const errors = [];
  const rootManifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const scope = rootManifest.name?.match(/^(@[^/]+)\//)?.[1];
  if (!scope) errors.push('Root package name must be scoped; its scope defines workspace naming.');
  const workspaces = discoverWorkspaces(root, groups).map((entry) => ({
    ...entry,
    files: walk(entry.directory),
  }));
  const byName = new Map();
  for (const workspace of workspaces) {
    const name = workspace.manifest.name;
    if (byName.has(name)) errors.push('Duplicate workspace name: ' + name);
    byName.set(name, workspace);
  }
  rules.checkRepository?.(workspaces, errors);
  for (const workspace of workspaces) {
    const { directory, location, manifest, files } = workspace;
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
    rules.checkManifest?.(workspace, label, errors);
    if (location === 'packages' && !manifest.exports)
      errors.push(label + ': declare public exports.');
    const runtime = {
      ...manifest.dependencies,
      ...manifest.peerDependencies,
      ...manifest.optionalDependencies,
    };
    const declared = { ...runtime, ...manifest.devDependencies };
    for (const group of DEPENDENCY_GROUPS) {
      for (const [dependency, range] of Object.entries(manifest[group] ?? {})) {
        rules.checkDependency?.(workspace, dependency, byName.get(dependency), label, errors);
        if (range === 'workspace:*' && !byName.has(dependency))
          errors.push(label + ': unknown workspace dependency ' + dependency + '.');
        if (byName.has(dependency) && range !== 'workspace:*')
          errors.push(label + ': internal dependency ' + dependency + ' must use workspace:*.');
        if (location === 'packages' && byName.get(dependency)?.location === 'apps')
          errors.push(label + ': packages cannot depend on application hosts.');
      }
    }
    if (checkExports) {
      for (const target of exportTargets(manifest.exports)) {
        const resolved = path.resolve(directory, target);
        if (!target.startsWith('./') || !contains(directory, resolved)) {
          errors.push(label + ': exports must target files inside the package: ' + target);
        } else if (target.includes('*')) {
          if (!walk(directory, true).some((file) => matches(resolved, file)))
            errors.push(label + ': missing public export ' + target);
        } else if (!existsSync(resolved))
          errors.push(label + ': missing public export ' + target + '; build packages first.');
      }
    }
    for (const file of files) {
      const relative = path.relative(directory, file);
      const report = (message) => errors.push(path.relative(root, file) + ': ' + message);
      const source = relative.startsWith('src' + path.sep);
      const test = /[.](test|spec)[.]/.test(file) || relative.startsWith('test' + path.sep);
      const code = /\.[cm]?[jt]sx?$/.test(file);
      const css = /\.(css|scss|sass|less)$/.test(file);
      if (!code && !css) continue;
      if (rules.ignoreFile?.(file)) continue;
      const text = readFileSync(file, 'utf8');
      rules.checkFile?.({
        directory,
        manifest,
        file,
        source,
        test,
        code,
        css,
        text,
        report,
        errors,
      });
      if (code && /['"`](?:\.\.\/)+packages\//u.test(text))
        report('resolve other workspaces through public package exports, not repository paths.');
      const specifiers = code
        ? ts.preProcessFile(text, true, true).importedFiles.map(({ fileName }) => fileName)
        : [...text.matchAll(/@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/g)].map((match) => match[1]);
      for (const { specifier, report: reportImport } of dependencySpecifiers(
        workspace,
        specifiers,
        report,
        checkExports
      )) {
        if (specifier.startsWith('.')) {
          rules.checkRelativeImport?.({ workspace, specifier, code, report: reportImport });
          if ((source || test) && !contains(directory, path.resolve(path.dirname(file), specifier)))
            reportImport('source import crosses a package boundary: ' + specifier);
          if (
            source &&
            !test &&
            manifest.workspaceKind === 'node-library' &&
            !/\.(?:[cm]?js|json|node)$/.test(specifier)
          )
            reportImport('Node library imports need explicit runtime extensions: ' + specifier);
          continue;
        }
        if (rules.isAlias?.(workspace, specifier)) continue;
        if (isBuiltin(specifier)) {
          rules.checkBuiltin?.({ manifest, source, test, report: reportImport });
          continue;
        }
        const dependency = specifier.startsWith('@')
          ? specifier.split('/').slice(0, 2).join('/')
          : specifier.split('/')[0];
        const imported = byName.get(dependency);
        rules.checkImport?.({
          workspace,
          imported,
          dependency,
          specifier,
          code,
          report: reportImport,
        });
        if (location === 'packages' && imported?.location === 'apps')
          reportImport('packages cannot depend on application hosts.');
        const allowed = source && !test ? runtime : declared;
        if (dependency !== manifest.name && !allowed[dependency])
          reportImport(
            'undeclared ' + (source && !test ? 'runtime ' : '') + 'dependency ' + dependency
          );
        if (imported) {
          const subpath =
            specifier === dependency ? '.' : './' + specifier.slice(dependency.length + 1);
          if (!exported(imported.manifest.exports, subpath))
            reportImport('import uses a non-public export: ' + specifier);
        }
      }
    }
  }
  errors.push(...checkEntryBoundaries(workspaces, byName));
  errors.push(...checkFeatureBoundaries(root, workspaces, byName));
  return errors;
}
