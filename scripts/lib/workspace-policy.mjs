import { checkUiTextSource } from './ui-text-policy.mjs';
import {
  checkPackageWorkspace,
  codeScripts,
  formatScripts,
  libraryPolicy,
} from './package-policy.mjs';
import {
  WORKSPACE_GROUPS,
  layerViolation,
  readAdapterProviderPackages,
  isProviderPackage,
  checkAdapterGraph,
} from './workspace-layers.mjs';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  parseWorkspaceApp,
  usesPreparedInputs,
  PREPARED_INPUT_CAPABILITIES,
} from '../../tooling/workspace-apps.ts';

const policies = {
  'node-library': libraryPolicy,
  'react-library': libraryPolicy,
  'next-app': {
    location: 'apps',
    scripts: [...codeScripts, 'start'],
    files: ['README.md', 'tsconfig.json', 'vitest.config.ts'],
  },
  styles: { location: 'packages', scripts: formatScripts, files: ['README.md'] },
};

function contains(directory, target) {
  const relative = path.relative(directory, target);
  return !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative);
}

function checkReactStyles({ directory, manifest, files }, label, errors) {
  const stylesDirectory = path.join(directory, 'src/styles');
  const entries = Object.entries(manifest.exports ?? {}).filter(([entry]) =>
    entry.endsWith('.css')
  );
  if (
    !entries.length &&
    !files.some((file) => file.endsWith('.css') && contains(stylesDirectory, file))
  )
    return;

  if (!entries.length) errors.push(label + ': export an explicit CSS entry.');
  for (const [entry, target] of entries) {
    if (
      !entry.startsWith('./') ||
      typeof target !== 'string' ||
      !target.startsWith('./src/styles/') ||
      !target.endsWith('.css') ||
      !contains(stylesDirectory, path.resolve(directory, target)) ||
      !files.includes(path.resolve(directory, target))
    )
      errors.push(label + ': CSS exports must target a source stylesheet in src/styles/: ' + entry);
  }
  if (!manifest.files?.some((entry) => ['src', 'src/styles'].includes(entry)))
    errors.push(label + ': include CSS sources in package files.');
  if (!Array.isArray(manifest.sideEffects) || !manifest.sideEffects.includes('**/*.css'))
    errors.push(label + ': CSS packages must preserve CSS side effects.');
}

export function checkWorkspace(root, { checkExports = true } = {}) {
  const providerPackages = readAdapterProviderPackages(root);
  return checkPackageWorkspace(root, {
    groups: WORKSPACE_GROUPS,
    policies,
    checkExports,
    rules: {
      checkRelativeImport({ workspace: { location }, specifier, code, report }) {
        if (location === 'packages' && code && /\.(css|scss|sass|less)$/.test(specifier))
          report('application entries select stylesheets.');
      },
      checkRepository(workspaces, errors) {
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
        errors.push(...checkAdapterGraph(workspaces, providerPackages));
      },
      checkManifest(workspace, label, errors) {
        const { directory, manifest } = workspace;
        if (manifest.workspaceKind === 'next-app') {
          try {
            parseWorkspaceApp(root, directory, manifest.workspaceApp);
            if (usesPreparedInputs(manifest))
              for (const key of ['app:prepare', 'app:check'])
                if (!manifest.scripts?.[key])
                  errors.push(`${label}: missing combined input command ${key}`);
            for (const {
              flag,
              kind: prefix,
              configuration,
              defaults,
            } of PREPARED_INPUT_CAPABILITIES) {
              const files = [configuration, ...defaults];
              if (manifest[flag] !== true) continue;
              for (const file of files)
                if (!existsSync(path.join(directory, file)))
                  errors.push(`${label}: missing ${prefix} file ${file}`);
              for (const key of [prefix + ':prepare', prefix + ':check'])
                if (!manifest.scripts?.[key])
                  errors.push(`${label}: missing ${prefix} command ${key}`);
              for (const key of ['dev', 'build', 'typecheck', 'test'])
                if (!manifest.scripts?.[key]?.startsWith('pnpm app:check && '))
                  errors.push(`${label}: ${key} must check prepared app inputs`);
            }
          } catch (error) {
            errors.push(label + ': ' + error.message);
          }
        }
        if (
          manifest.workspaceKind === 'styles' &&
          (!Array.isArray(manifest.sideEffects) || !manifest.sideEffects.includes('**/*.css'))
        ) {
          errors.push(label + ': CSS packages must preserve CSS side effects.');
        }
        if (manifest.workspaceKind === 'react-library') {
          if (!manifest.peerDependencies?.react)
            errors.push(label + ': React libraries must declare a React peer dependency.');
          checkReactStyles(workspace, label, errors);
        }
      },
      checkDependency({ layer }, dependency, imported, label, errors) {
        const violation = layerViolation(layer, imported?.layer);
        if (violation) errors.push(label + ': ' + violation + ': ' + dependency);
        if (layer !== 'adapter' && isProviderPackage(dependency, providerPackages))
          errors.push(label + ': provider SDK dependencies belong in adapters: ' + dependency);
      },
      ignoreFile: (file) => file.endsWith('next-env.d.ts'),
      checkFile({ directory, manifest, file, source, test, code, css, text, report, errors }) {
        if (css && manifest.workspaceKind !== 'styles') {
          const isStyleOwner = ['react-library', 'next-app'].includes(manifest.workspaceKind);
          if (
            !isStyleOwner ||
            !file.endsWith('.css') ||
            file.endsWith('.module.css') ||
            !contains(path.join(directory, 'src/styles'), file)
          )
            report('CSS belongs in a styles workspace or in React/Next src/styles/.');
        }
        if (manifest.workspaceTextResources === true && source && !test && code)
          errors.push(...checkUiTextSource(path.relative(root, file), text));
      },
      isAlias: ({ location }, specifier) => location === 'apps' && specifier.startsWith('@/'),
      checkBuiltin({ manifest, source, test, report }) {
        if (source && !test && manifest.workspaceKind === 'react-library')
          report('browser UI cannot import Node builtins.');
      },
      checkImport({
        workspace: { layer, location },
        imported,
        dependency,
        specifier,
        code,
        report,
      }) {
        const violation = layerViolation(layer, imported?.layer);
        if (violation) report(violation.replace('depend on site', 'import site'));
        if (layer !== 'adapter' && isProviderPackage(dependency, providerPackages))
          report('provider SDK imports belong in adapters: ' + dependency);
        if (location === 'packages' && ['next', 'server-only', 'client-only'].includes(dependency))
          report('framework integration belongs in apps/.');
        if (
          location === 'packages' &&
          code &&
          (imported?.manifest.workspaceKind === 'styles' ||
            /\.(css|scss|sass|less)$/.test(specifier))
        )
          report('application entries select stylesheets.');
      },
    },
  });
}
