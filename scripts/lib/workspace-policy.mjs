import { checkFeatureBoundaries } from './feature-boundaries/check.mjs';
import { checkUiTextSource } from './ui-text-policy.mjs';
import { checkEntryBoundaries } from './entry-boundaries.mjs';
import {
  WORKSPACE_GROUPS,
  DEPENDENCY_GROUPS,
  layerViolation,
  readAdapterProviderPackages,
  isProviderPackage,
  checkAdapterGraph,
} from './workspace-layers.mjs';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import {
  parseWorkspaceApp,
  usesPreparedInputs,
  PREPARED_INPUT_CAPABILITIES,
} from '../../tooling/workspace-apps.ts';

const builtins = new Set(builtinModules.flatMap((name) => [name, 'node:' + name]));
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
function inside(directory, target) {
  return !outside(directory, target);
}
function checkReactStyles({ directory, manifest, files }, label, errors) {
  const stylesDirectory = path.join(directory, 'src/styles');
  const entries = Object.entries(manifest.exports ?? {}).filter(([entry]) =>
    entry.endsWith('.css')
  );
  if (
    !entries.length &&
    !files.some((file) => file.endsWith('.css') && inside(stylesDirectory, file))
  )
    return;

  if (!entries.length) errors.push(label + ': export an explicit CSS entry.');
  for (const [entry, target] of entries) {
    if (
      !entry.startsWith('./') ||
      typeof target !== 'string' ||
      !target.startsWith('./src/styles/') ||
      !target.endsWith('.css') ||
      !inside(stylesDirectory, path.resolve(directory, target)) ||
      !files.includes(path.resolve(directory, target))
    )
      errors.push(label + ': CSS exports must target a source stylesheet in src/styles/: ' + entry);
  }
  if (!manifest.files?.some((entry) => ['src', 'src/styles'].includes(entry)))
    errors.push(label + ': include CSS sources in package files.');
  if (!Array.isArray(manifest.sideEffects) || !manifest.sideEffects.includes('**/*.css'))
    errors.push(label + ': CSS packages must preserve CSS side effects.');
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
  const groups = WORKSPACE_GROUPS;
  const providerPackages = readAdapterProviderPackages(root);
  const packagesDirectory = path.join(root, 'packages');
  if (existsSync(packagesDirectory)) {
    for (const entry of readdirSync(packagesDirectory)) {
      if (existsSync(path.join(packagesDirectory, entry, 'package.json')))
        errors.push(
          'packages/' +
            entry +
            ': live packages belong in packages/shared, packages/site or packages/adapters.'
        );
    }
  }
  const workspaces = groups.flatMap(({ parent, location, layer }) => {
    const directory = path.join(root, parent);
    if (!existsSync(directory)) return [];
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      if (!entry.isDirectory()) return [];
      const target = path.join(directory, entry.name);
      const file = path.join(target, 'package.json');
      if (!existsSync(file)) return [];
      const manifest = readJson(file);
      if (layer === 'template' && manifest.workspaceKind !== 'next-app') return [];
      return [{ directory: target, location, layer, manifest, files: walk(target) }];
    });
  });
  const byName = new Map();
  for (const workspace of workspaces) {
    const name = workspace.manifest.name;
    if (byName.has(name)) errors.push('Duplicate workspace name: ' + name);
    byName.set(name, workspace);
  }
  errors.push(...checkAdapterGraph(workspaces, providerPackages));
  for (const { directory, location, layer, manifest, files } of workspaces) {
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
    if (manifest.workspaceKind === 'next-app') {
      try {
        parseWorkspaceApp(root, directory, manifest.workspaceApp);
        if (usesPreparedInputs(manifest))
          for (const key of ['app:prepare', 'app:check'])
            if (!manifest.scripts?.[key])
              errors.push(`${label}: missing combined input command ${key}`);
        for (const { flag, kind: prefix, configuration, defaults } of PREPARED_INPUT_CAPABILITIES) {
          const files = [configuration, ...defaults];
          if (manifest[flag] !== true) continue;
          for (const file of files)
            if (!existsSync(path.join(directory, file)))
              errors.push(`${label}: missing ${prefix} file ${file}`);
          for (const key of [prefix + ':prepare', prefix + ':check'])
            if (!manifest.scripts?.[key]) errors.push(`${label}: missing ${prefix} command ${key}`);
          for (const key of ['dev', 'build', 'typecheck', 'test'])
            if (!manifest.scripts?.[key]?.startsWith('pnpm app:check && '))
              errors.push(`${label}: ${key} must check prepared app inputs`);
        }
      } catch (error) {
        errors.push(label + ': ' + error.message);
      }
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
    if (manifest.workspaceKind === 'react-library')
      checkReactStyles({ directory, manifest, files }, label, errors);
    const runtime = {
      ...manifest.dependencies,
      ...manifest.peerDependencies,
      ...manifest.optionalDependencies,
    };
    const declared = { ...runtime, ...manifest.devDependencies };
    for (const group of DEPENDENCY_GROUPS) {
      for (const [dependency, range] of Object.entries(manifest[group] ?? {})) {
        const violation = layerViolation(layer, byName.get(dependency)?.layer);
        if (violation) errors.push(label + ': ' + violation + ': ' + dependency);
        if (layer !== 'adapter' && isProviderPackage(dependency, providerPackages))
          errors.push(label + ': provider SDK dependencies belong in adapters: ' + dependency);
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
        if (!target.startsWith('./') || outside(directory, resolved)) {
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
      if (css && manifest.workspaceKind !== 'styles') {
        const isStyleOwner = ['react-library', 'next-app'].includes(manifest.workspaceKind);
        if (
          !isStyleOwner ||
          !file.endsWith('.css') ||
          file.endsWith('.module.css') ||
          !inside(path.join(directory, 'src/styles'), file)
        )
          report('CSS belongs in a styles workspace or in React/Next src/styles/.');
      }
      if ((!code && !css) || file.endsWith('next-env.d.ts')) continue;
      const text = readFileSync(file, 'utf8');
      if (manifest.workspaceTextResources === true && source && !test && code)
        errors.push(...checkUiTextSource(path.relative(root, file), text));
      if (code && /['"`](?:\.\.\/)+packages\//u.test(text))
        report('resolve other workspaces through public package exports, not repository paths.');
      const specifiers = code
        ? ts.preProcessFile(text, true, true).importedFiles.map(({ fileName }) => fileName)
        : [...text.matchAll(/@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/g)].map((match) => match[1]);
      for (const specifier of specifiers) {
        if (specifier.startsWith('.')) {
          if (location === 'packages' && code && /\.(css|scss|sass|less)$/.test(specifier))
            report('application entries select stylesheets.');
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
        const violation = layerViolation(layer, imported?.layer);
        if (violation) report(violation.replace('depend on site', 'import site'));
        if (layer !== 'adapter' && isProviderPackage(dependency, providerPackages))
          report('provider SDK imports belong in adapters: ' + dependency);
        if (location === 'packages' && ['next', 'server-only', 'client-only'].includes(dependency))
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
  errors.push(...checkEntryBoundaries(workspaces, byName));
  errors.push(...checkFeatureBoundaries(root, workspaces, byName));
  return errors;
}
