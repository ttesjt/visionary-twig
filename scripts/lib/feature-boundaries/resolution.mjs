import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { publicTarget } from '../entry-boundaries.mjs';
import { contains, importTargets, localPackageImport, sourceFile } from '../module-targets.mjs';

const NO_INPUT_FILES_DIAGNOSTIC_CODE = 18003;

/** Resolve source identities before and after dist builds, including tsconfig path aliases. */
export function createSourceResolver(workspaces, byName) {
  const configurations = new Map();
  const caches = new Map();
  function options(workspace) {
    if (configurations.has(workspace)) return configurations.get(workspace);
    const file = path.join(workspace.directory, 'tsconfig.json');
    let result = {
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowJs: true,
      resolveJsonModule: true,
    };
    if (existsSync(file)) {
      const config = ts.readConfigFile(file, ts.sys.readFile);
      if (config.error)
        throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
      const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, workspace.directory);
      const errors = parsed.errors.filter((error) => error.code !== NO_INPUT_FILES_DIAGNOSTIC_CODE);
      if (errors.length)
        throw new Error(ts.flattenDiagnosticMessageText(errors[0].messageText, '\n'));
      result = parsed.options;
    }
    configurations.set(workspace, result);
    caches.set(
      workspace,
      ts.createModuleResolutionCache(workspace.directory, (value) => value, result)
    );
    return result;
  }
  function resolve(workspace, file, specifier) {
    const name = specifier.startsWith('@')
      ? specifier.split('/').slice(0, 2).join('/')
      : specifier.split('/')[0];
    const imported = byName.get(name);
    if (imported) {
      const subpath = specifier === name ? '.' : './' + specifier.slice(name.length + 1);
      const source = sourceFile(imported.directory, publicTarget(imported.manifest, subpath));
      return source ? realpathSync(source) : undefined;
    }
    const compilerOptions = options(workspace);
    const resolved = ts.resolveModuleName(
      specifier,
      file,
      compilerOptions,
      ts.sys,
      caches.get(workspace)
    ).resolvedModule?.resolvedFileName;
    if (!resolved) return undefined;
    const physical = realpathSync(resolved);
    // Aliases or explicit repository paths can target another workspace's dist.
    for (const candidate of workspaces) {
      const dist = path.join(realpathSync(candidate.directory), 'dist');
      if (!contains(dist, physical)) continue;
      const source = sourceFile(
        candidate.directory,
        './dist/' + path.relative(dist, physical).replaceAll(path.sep, '/')
      );
      if (source) return realpathSync(source);
    }
    return physical;
  }
  return (workspace, file, specifier) =>
    importTargets(workspace.manifest, specifier).flatMap((target) => {
      const resolved =
        specifier.startsWith('#') && target.startsWith('.')
          ? localPackageImport(workspace.directory, target)?.source
          : resolve(workspace, file, target);
      return resolved ? [resolved] : [];
    });
}
